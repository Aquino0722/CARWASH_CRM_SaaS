using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using Carwash.Application.Features.ServiceOrders;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Persistence.ServiceOrders;

public sealed class ServiceOrderRepository : IServiceOrderRepository
{
    private readonly string _connectionString;

    public ServiceOrderRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<PaginatedResult<ServiceOrderListItemDto>> SearchAsync(
        Guid tenantId, string? search, string? status, DateTime? from, DateTime? to,
        int page, int pageSize, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var countSql = """
            SELECT COUNT(*)
            FROM app.service_orders so
            JOIN app.customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
            JOIN app.vehicles v ON v.id = so.vehicle_id AND v.tenant_id = so.tenant_id
            WHERE so.tenant_id = @TenantId
              AND (@Search IS NULL OR
                   so.title ILIKE '%' || @Search || '%' OR
                   c.full_name ILIKE '%' || @Search || '%' OR
                   v.plate ILIKE '%' || @Search || '%')
              AND (@Status IS NULL OR so.status::text = @Status)
              AND (@From IS NULL OR so.scheduled_at >= @From)
              AND (@To IS NULL OR so.scheduled_at <= @To)
            """;

        var total = await conn.ExecuteScalarAsync<int>(countSql, new
        {
            TenantId = tenantId,
            Search = search,
            Status = status,
            From = from,
            To = to
        });

        var dataSql = """
            SELECT so.id AS Id, so.customer_id AS CustomerId,
                   c.full_name AS CustomerName,
                   so.vehicle_id AS VehicleId,
                   v.plate AS Plate,
                   v.make AS VehicleMake,
                   v.model AS VehicleModel,
                   so.status::text AS Status,
                   so.title AS Title,
                   so.package_name AS PackageName,
                   so.estimated_price AS EstimatedPrice,
                   so.scheduled_at AS ScheduledAt,
                   so.created_at AS CreatedAt
            FROM app.service_orders so
            JOIN app.customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
            JOIN app.vehicles v ON v.id = so.vehicle_id AND v.tenant_id = so.tenant_id
            WHERE so.tenant_id = @TenantId
              AND (@Search IS NULL OR
                   so.title ILIKE '%' || @Search || '%' OR
                   c.full_name ILIKE '%' || @Search || '%' OR
                   v.plate ILIKE '%' || @Search || '%')
              AND (@Status IS NULL OR so.status::text = @Status)
              AND (@From IS NULL OR so.scheduled_at >= @From)
              AND (@To IS NULL OR so.scheduled_at <= @To)
            ORDER BY so.created_at DESC
            LIMIT @PageSize OFFSET @Offset
            """;

        var rows = await conn.QueryAsync<ServiceOrderListRow>(dataSql, new
        {
            TenantId = tenantId,
            Search = search,
            Status = status,
            From = from,
            To = to,
            PageSize = pageSize,
            Offset = (page - 1) * pageSize
        });

        var items = rows.Select(r => new ServiceOrderListItemDto(
            r.Id, r.CustomerId, r.CustomerName,
            r.VehicleId, r.Plate, r.VehicleMake, r.VehicleModel,
            r.Status, r.Title, r.PackageName,
            r.EstimatedPrice, r.ScheduledAt, r.CreatedAt)).ToList();

        return new PaginatedResult<ServiceOrderListItemDto>(items.AsReadOnly(), page, pageSize, total);
    }

    public async Task<ServiceOrderDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT so.id AS Id, so.customer_id AS CustomerId,
                   c.full_name AS CustomerName,
                   so.vehicle_id AS VehicleId,
                   v.plate AS Plate,
                   v.make AS VehicleMake,
                   v.model AS VehicleModel,
                   so.status::text AS Status,
                   so.title AS Title,
                   so.package_name AS PackageName,
                   so.estimated_price AS EstimatedPrice,
                   so.final_price AS FinalPrice,
                   so.check_in_at AS CheckInAt,
                   so.scheduled_at AS ScheduledAt,
                   so.due_at AS DueAt,
                   so.delivered_at AS DeliveredAt,
                   so.internal_notes AS InternalNotes,
                   so.customer_notes AS CustomerNotes,
                   so.version AS Version,
                   so.created_by AS CreatedBy,
                   so.created_at AS CreatedAt,
                   so.updated_at AS UpdatedAt
            FROM app.service_orders so
            JOIN app.customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
            JOIN app.vehicles v ON v.id = so.vehicle_id AND v.tenant_id = so.tenant_id
            WHERE so.tenant_id = @TenantId AND so.id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<ServiceOrderDetailRow>(sql, new
        {
            TenantId = tenantId,
            Id = id
        });

        if (row is null)
            return null;

        return new ServiceOrderDetailDto(
            row.Id, row.CustomerId, row.CustomerName,
            row.VehicleId, row.Plate, row.VehicleMake, row.VehicleModel,
            row.Status, row.Title, row.PackageName,
            row.EstimatedPrice, row.FinalPrice,
            row.CheckInAt, row.ScheduledAt, row.DueAt, row.DeliveredAt,
            row.InternalNotes, row.CustomerNotes,
            row.Version, row.CreatedBy, row.CreatedAt, row.UpdatedAt);
    }

    public async Task<bool> CustomerBelongsToTenantAsync(Guid tenantId, Guid customerId, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT EXISTS(
                SELECT 1 FROM app.customers
                WHERE id = @Id AND tenant_id = @TenantId
            )
            """;

        return await conn.ExecuteScalarAsync<bool>(sql, new { Id = customerId, TenantId = tenantId });
    }

    public async Task<bool> VehicleBelongsToCustomerAsync(Guid tenantId, Guid vehicleId, Guid customerId, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT EXISTS(
                SELECT 1 FROM app.vehicles
                WHERE id = @Id AND tenant_id = @TenantId AND customer_id = @CustomerId
            )
            """;

        return await conn.ExecuteScalarAsync<bool>(sql, new
        {
            Id = vehicleId,
            TenantId = tenantId,
            CustomerId = customerId
        });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId, Guid customerId, Guid vehicleId, string title,
        string? packageName, decimal? estimatedPrice, DateTime? scheduledAt, DateTime? dueAt,
        string? internalNotes, string? customerNotes,
        Guid createdBy, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            INSERT INTO app.service_orders
                (tenant_id, customer_id, vehicle_id, title, package_name,
                 estimated_price, scheduled_at, due_at,
                 internal_notes, customer_notes, created_by)
            VALUES
                (@TenantId, @CustomerId, @VehicleId, @Title, @PackageName,
                 @EstimatedPrice, @ScheduledAt, @DueAt,
                 @InternalNotes, @CustomerNotes, @CreatedBy)
            RETURNING id
            """;

        var id = await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            CustomerId = customerId,
            VehicleId = vehicleId,
            Title = title,
            PackageName = packageName,
            EstimatedPrice = estimatedPrice,
            ScheduledAt = scheduledAt,
            DueAt = dueAt,
            InternalNotes = internalNotes,
            CustomerNotes = customerNotes,
            CreatedBy = createdBy
        });

        return id;
    }

    public async Task<ServiceOrderUpdateResult> UpdateAsync(
        Guid tenantId, Guid id, int currentVersion,
        string title, string? packageName, decimal? estimatedPrice, decimal? finalPrice,
        DateTime? scheduledAt, DateTime? dueAt,
        string? internalNotes, string? customerNotes,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.service_orders
            SET title = @Title,
                package_name = @PackageName,
                estimated_price = @EstimatedPrice,
                final_price = @FinalPrice,
                scheduled_at = @ScheduledAt,
                due_at = @DueAt,
                internal_notes = @InternalNotes,
                customer_notes = @CustomerNotes,
                version = version + 1,
                updated_at = NOW()
            WHERE id = @Id AND tenant_id = @TenantId AND version = @CurrentVersion
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            Id = id,
            CurrentVersion = currentVersion,
            Title = title,
            PackageName = packageName,
            EstimatedPrice = estimatedPrice,
            FinalPrice = finalPrice,
            ScheduledAt = scheduledAt,
            DueAt = dueAt,
            InternalNotes = internalNotes,
            CustomerNotes = customerNotes
        });

        if (affected > 0)
            return new ServiceOrderUpdateResult(Found: true);

        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM app.service_orders WHERE id = @Id AND tenant_id = @TenantId)",
            new { Id = id, TenantId = tenantId });

        if (!exists)
            return new ServiceOrderUpdateResult(Found: false);

        return new ServiceOrderUpdateResult(Found: true, Conflict: true);
    }

    public async Task<ServiceOrderStatusUpdateResult> UpdateStatusAsync(
        Guid tenantId, Guid id, int currentVersion,
        string newStatus, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var updateSql = newStatus == "delivered"
            ? """
            UPDATE app.service_orders
            SET status = @NewStatus::app.service_order_status,
                delivered_at = NOW(),
                version = version + 1,
                updated_at = NOW()
            WHERE id = @Id AND tenant_id = @TenantId AND version = @CurrentVersion
            """
            : """
            UPDATE app.service_orders
            SET status = @NewStatus::app.service_order_status,
                version = version + 1,
                updated_at = NOW()
            WHERE id = @Id AND tenant_id = @TenantId AND version = @CurrentVersion
            """;

        var affected = await conn.ExecuteAsync(updateSql, new
        {
            TenantId = tenantId,
            Id = id,
            CurrentVersion = currentVersion,
            NewStatus = newStatus
        });

        if (affected > 0)
            return new ServiceOrderStatusUpdateResult(Found: true);

        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM app.service_orders WHERE id = @Id AND tenant_id = @TenantId)",
            new { Id = id, TenantId = tenantId });

        if (!exists)
            return new ServiceOrderStatusUpdateResult(Found: false);

        return new ServiceOrderStatusUpdateResult(Found: true, Conflict: true);
    }

    private sealed record ServiceOrderListRow
    {
        public Guid Id { get; init; }
        public Guid CustomerId { get; init; }
        public string CustomerName { get; init; } = default!;
        public Guid VehicleId { get; init; }
        public string? Plate { get; init; }
        public string? VehicleMake { get; init; }
        public string? VehicleModel { get; init; }
        public string Status { get; init; } = default!;
        public string Title { get; init; } = default!;
        public string? PackageName { get; init; }
        public decimal? EstimatedPrice { get; init; }
        public DateTime? ScheduledAt { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    private sealed record ServiceOrderDetailRow
    {
        public Guid Id { get; init; }
        public Guid CustomerId { get; init; }
        public string CustomerName { get; init; } = default!;
        public Guid VehicleId { get; init; }
        public string? Plate { get; init; }
        public string? VehicleMake { get; init; }
        public string? VehicleModel { get; init; }
        public string Status { get; init; } = default!;
        public string Title { get; init; } = default!;
        public string? PackageName { get; init; }
        public decimal? EstimatedPrice { get; init; }
        public decimal? FinalPrice { get; init; }
        public DateTime? CheckInAt { get; init; }
        public DateTime? ScheduledAt { get; init; }
        public DateTime? DueAt { get; init; }
        public DateTime? DeliveredAt { get; init; }
        public string? InternalNotes { get; init; }
        public string? CustomerNotes { get; init; }
        public int Version { get; init; }
        public Guid? CreatedBy { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
}
