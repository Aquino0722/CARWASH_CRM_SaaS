using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using Carwash.Application.Features.WorkItems;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Persistence.WorkItems;

public sealed class WorkItemRepository : IWorkItemRepository
{
    private readonly string _connectionString;

    public WorkItemRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<PaginatedResult<WorkItemListItemDto>> SearchAsync(
        Guid tenantId, Guid? serviceOrderId, Guid? bayId, string? status,
        int page, int pageSize, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var countSql = """
            SELECT COUNT(*)
            FROM app.work_items
            WHERE tenant_id = @TenantId
              AND (@ServiceOrderId IS NULL OR service_order_id = @ServiceOrderId)
              AND (@BayId IS NULL OR bay_id = @BayId)
              AND (@Status IS NULL OR status = @Status)
            """;

        var total = await conn.ExecuteScalarAsync<int>(countSql, new
        {
            TenantId = tenantId,
            ServiceOrderId = serviceOrderId,
            BayId = bayId,
            Status = status
        });

        var dataSql = """
            SELECT id AS Id, service_order_id AS ServiceOrderId,
                   bay_id AS BayId, title AS Title, status AS Status,
                   position AS Position, assigned_to AS AssignedTo,
                   started_at AS StartedAt, completed_at AS CompletedAt,
                   created_at AS CreatedAt
            FROM app.work_items
            WHERE tenant_id = @TenantId
              AND (@ServiceOrderId IS NULL OR service_order_id = @ServiceOrderId)
              AND (@BayId IS NULL OR bay_id = @BayId)
              AND (@Status IS NULL OR status = @Status)
            ORDER BY bay_id ASC, position ASC
            LIMIT @PageSize OFFSET @Offset
            """;

        var rows = await conn.QueryAsync<WorkItemListRow>(dataSql, new
        {
            TenantId = tenantId,
            ServiceOrderId = serviceOrderId,
            BayId = bayId,
            Status = status,
            PageSize = pageSize,
            Offset = (page - 1) * pageSize
        });

        var items = rows.Select(r => new WorkItemListItemDto(
            r.Id, r.ServiceOrderId, r.BayId, r.Title, r.Status,
            r.Position, r.AssignedTo, r.StartedAt, r.CompletedAt, r.CreatedAt)).ToList();

        return new PaginatedResult<WorkItemListItemDto>(items.AsReadOnly(), page, pageSize, total);
    }

    public async Task<WorkItemDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT id AS Id, service_order_id AS ServiceOrderId,
                   bay_id AS BayId, title AS Title, status AS Status,
                   position AS Position, assigned_to AS AssignedTo,
                   checklist::text AS Checklist, version AS Version,
                   started_at AS StartedAt, completed_at AS CompletedAt,
                   created_at AS CreatedAt
            FROM app.work_items
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<WorkItemDetailRow>(sql, new
        {
            TenantId = tenantId,
            Id = id
        });

        if (row is null)
            return null;

        return new WorkItemDetailDto(
            row.Id, row.ServiceOrderId, row.BayId, row.Title, row.Status,
            row.Position, row.AssignedTo, row.Checklist, row.Version,
            row.StartedAt, row.CompletedAt, row.CreatedAt);
    }

    public async Task<bool> ServiceOrderBelongsToTenantAsync(Guid tenantId, Guid serviceOrderId, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT EXISTS(
                SELECT 1 FROM app.service_orders
                WHERE id = @Id AND tenant_id = @TenantId
            )
            """;

        return await conn.ExecuteScalarAsync<bool>(sql, new { Id = serviceOrderId, TenantId = tenantId });
    }

    public async Task<bool> BayBelongsToTenantAsync(Guid tenantId, Guid bayId, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT EXISTS(
                SELECT 1 FROM app.bays
                WHERE id = @Id AND tenant_id = @TenantId
            )
            """;

        return await conn.ExecuteScalarAsync<bool>(sql, new { Id = bayId, TenantId = tenantId });
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId, Guid serviceOrderId, string title,
        Guid? bayId, decimal? position, Guid? assignedTo, string? checklist,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            INSERT INTO app.work_items
                (tenant_id, service_order_id, title, bay_id, position, assigned_to, checklist)
            VALUES
                (@TenantId, @ServiceOrderId, @Title, @BayId, @Position, @AssignedTo, @Checklist::jsonb)
            RETURNING id
            """;

        var id = await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            ServiceOrderId = serviceOrderId,
            Title = title,
            BayId = bayId,
            Position = position ?? 1000m,
            AssignedTo = assignedTo,
            Checklist = checklist ?? "[]"
        });

        return id;
    }

    public async Task<WorkItemUpdateResult> UpdateAsync(
        Guid tenantId, Guid id, int currentVersion,
        string title, Guid? assignedTo, string? checklist,
        DateTime? startedAt, DateTime? completedAt,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.work_items
            SET title = @Title,
                assigned_to = @AssignedTo,
                checklist = @Checklist::jsonb,
                started_at = @StartedAt,
                completed_at = @CompletedAt,
                version = version + 1
            WHERE id = @Id AND tenant_id = @TenantId AND version = @CurrentVersion
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            Id = id,
            CurrentVersion = currentVersion,
            Title = title,
            AssignedTo = assignedTo,
            Checklist = checklist ?? "[]",
            StartedAt = startedAt,
            CompletedAt = completedAt
        });

        if (affected > 0)
            return new WorkItemUpdateResult(Found: true);

        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM app.work_items WHERE id = @Id AND tenant_id = @TenantId)",
            new { Id = id, TenantId = tenantId });

        if (!exists)
            return new WorkItemUpdateResult(Found: false);

        return new WorkItemUpdateResult(Found: true, Conflict: true);
    }

    public async Task<WorkItemMoveResult> MoveAsync(
        Guid tenantId, Guid id, int currentVersion,
        Guid? bayId, decimal position,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.work_items
            SET bay_id = @BayId,
                position = @Position,
                version = version + 1
            WHERE id = @Id AND tenant_id = @TenantId AND version = @CurrentVersion
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            Id = id,
            CurrentVersion = currentVersion,
            BayId = bayId,
            Position = position
        });

        if (affected > 0)
            return new WorkItemMoveResult(Found: true);

        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM app.work_items WHERE id = @Id AND tenant_id = @TenantId)",
            new { Id = id, TenantId = tenantId });

        if (!exists)
            return new WorkItemMoveResult(Found: false);

        return new WorkItemMoveResult(Found: true, Conflict: true);
    }

    public async Task<WorkItemStatusUpdateResult> UpdateStatusAsync(
        Guid tenantId, Guid id, int currentVersion,
        string newStatus, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.work_items
            SET status = @NewStatus,
                version = version + 1
            WHERE id = @Id AND tenant_id = @TenantId AND version = @CurrentVersion
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            Id = id,
            CurrentVersion = currentVersion,
            NewStatus = newStatus
        });

        if (affected > 0)
            return new WorkItemStatusUpdateResult(Found: true);

        var exists = await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM app.work_items WHERE id = @Id AND tenant_id = @TenantId)",
            new { Id = id, TenantId = tenantId });

        if (!exists)
            return new WorkItemStatusUpdateResult(Found: false);

        return new WorkItemStatusUpdateResult(Found: true, Conflict: true);
    }

    private sealed record WorkItemListRow
    {
        public Guid Id { get; init; }
        public Guid ServiceOrderId { get; init; }
        public Guid? BayId { get; init; }
        public string Title { get; init; } = default!;
        public string Status { get; init; } = default!;
        public decimal Position { get; init; }
        public Guid? AssignedTo { get; init; }
        public DateTime? StartedAt { get; init; }
        public DateTime? CompletedAt { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    private sealed record WorkItemDetailRow
    {
        public Guid Id { get; init; }
        public Guid ServiceOrderId { get; init; }
        public Guid? BayId { get; init; }
        public string Title { get; init; } = default!;
        public string Status { get; init; } = default!;
        public decimal Position { get; init; }
        public Guid? AssignedTo { get; init; }
        public string? Checklist { get; init; }
        public int Version { get; init; }
        public DateTime? StartedAt { get; init; }
        public DateTime? CompletedAt { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
