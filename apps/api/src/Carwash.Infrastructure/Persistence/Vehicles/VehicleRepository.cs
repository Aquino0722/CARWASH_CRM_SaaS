using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using Carwash.Application.Features.Vehicles;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Persistence.Vehicles;

public sealed class VehicleRepository : IVehicleRepository
{
    private readonly string _connectionString;

    public VehicleRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<PaginatedResult<VehicleListItemDto>> SearchAsync(
        Guid tenantId, string? search, Guid? customerId, int page, int pageSize, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var countSql = """
            SELECT COUNT(*)
            FROM app.vehicles v
            JOIN app.customers c ON c.id = v.customer_id AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = @TenantId
              AND (@Search IS NULL OR
                   v.plate ILIKE '%' || @Search || '%' OR
                   v.make ILIKE '%' || @Search || '%' OR
                   v.model ILIKE '%' || @Search || '%' OR
                   v.color ILIKE '%' || @Search || '%' OR
                   c.full_name ILIKE '%' || @Search || '%')
              AND (@CustomerId IS NULL OR v.customer_id = @CustomerId)
            """;

        var total = await conn.ExecuteScalarAsync<int>(countSql, new
        {
            TenantId = tenantId,
            Search = search,
            CustomerId = customerId
        });

        var dataSql = """
            SELECT v.id AS Id, v.customer_id AS CustomerId,
                   c.full_name AS CustomerName,
                   v.plate AS Plate, v.make AS Make, v.model AS Model,
                   v.year AS Year, v.color AS Color, v.created_at AS CreatedAt
            FROM app.vehicles v
            JOIN app.customers c ON c.id = v.customer_id AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = @TenantId
              AND (@Search IS NULL OR
                   v.plate ILIKE '%' || @Search || '%' OR
                   v.make ILIKE '%' || @Search || '%' OR
                   v.model ILIKE '%' || @Search || '%' OR
                   v.color ILIKE '%' || @Search || '%' OR
                   c.full_name ILIKE '%' || @Search || '%')
              AND (@CustomerId IS NULL OR v.customer_id = @CustomerId)
            ORDER BY v.created_at DESC
            LIMIT @PageSize OFFSET @Offset
            """;

        var rows = await conn.QueryAsync<VehicleListRow>(dataSql, new
        {
            TenantId = tenantId,
            Search = search,
            CustomerId = customerId,
            PageSize = pageSize,
            Offset = (page - 1) * pageSize
        });

        var items = rows.Select(r => new VehicleListItemDto(
            r.Id, r.CustomerId, r.CustomerName, r.Plate,
            r.Make, r.Model, r.Year, r.Color, r.CreatedAt)).ToList();

        return new PaginatedResult<VehicleListItemDto>(items.AsReadOnly(), page, pageSize, total);
    }

    public async Task<VehicleDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT v.id AS Id, v.customer_id AS CustomerId,
                   c.full_name AS CustomerName,
                   v.plate AS Plate, v.vin AS Vin,
                   v.make AS Make, v.model AS Model,
                   v.year AS Year, v.color AS Color,
                   v.trim AS Trim, v.notes AS Notes,
                   v.created_at AS CreatedAt, v.updated_at AS UpdatedAt
            FROM app.vehicles v
            JOIN app.customers c ON c.id = v.customer_id AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = @TenantId AND v.id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<VehicleDetailRow>(sql, new { TenantId = tenantId, Id = id });

        if (row is null)
            return null;

        return new VehicleDetailDto(
            row.Id, row.CustomerId, row.CustomerName, row.Plate, row.Vin,
            row.Make, row.Model, row.Year, row.Color, row.Trim, row.Notes,
            row.CreatedAt, row.UpdatedAt);
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

    public async Task<VehicleCreateResult> CreateAsync(
        Guid tenantId, Guid customerId, string make, string model,
        string? plate, string? vin, int? year, string? color, string? trim, string? notes,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            INSERT INTO app.vehicles (tenant_id, customer_id, plate, vin, make, model, year, color, trim, notes)
            VALUES (@TenantId, @CustomerId, @Plate, @Vin, @Make, @Model, @Year, @Color, @Trim, @Notes)
            RETURNING id
            """;

        try
        {
            var id = await conn.ExecuteScalarAsync<Guid>(sql, new
            {
                TenantId = tenantId,
                CustomerId = customerId,
                Plate = plate,
                Vin = vin,
                Make = make,
                Model = model,
                Year = year,
                Color = color,
                Trim = trim,
                Notes = notes
            });

            return new VehicleCreateResult(id, false);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            return new VehicleCreateResult(Guid.Empty, true);
        }
    }

    public async Task<VehicleUpdateResult> UpdateAsync(
        Guid tenantId, Guid id, Guid customerId, string make, string model,
        string? plate, string? vin, int? year, string? color, string? trim, string? notes,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.vehicles
            SET customer_id = @CustomerId,
                plate = @Plate,
                vin = @Vin,
                make = @Make,
                model = @Model,
                year = @Year,
                color = @Color,
                trim = @Trim,
                notes = @Notes,
                updated_at = NOW()
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        try
        {
            var affected = await conn.ExecuteAsync(sql, new
            {
                TenantId = tenantId,
                Id = id,
                CustomerId = customerId,
                Plate = plate,
                Vin = vin,
                Make = make,
                Model = model,
                Year = year,
                Color = color,
                Trim = trim,
                Notes = notes
            });

            return new VehicleUpdateResult(affected > 0, false);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            return new VehicleUpdateResult(false, true);
        }
    }

    private sealed record VehicleListRow
    {
        public Guid Id { get; init; }
        public Guid CustomerId { get; init; }
        public string CustomerName { get; init; } = default!;
        public string? Plate { get; init; }
        public string Make { get; init; } = default!;
        public string Model { get; init; } = default!;
        public int? Year { get; init; }
        public string? Color { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    private sealed record VehicleDetailRow
    {
        public Guid Id { get; init; }
        public Guid CustomerId { get; init; }
        public string CustomerName { get; init; } = default!;
        public string? Plate { get; init; }
        public string? Vin { get; init; }
        public string Make { get; init; } = default!;
        public string Model { get; init; } = default!;
        public int? Year { get; init; }
        public string? Color { get; init; }
        public string? Trim { get; init; }
        public string? Notes { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
}
