using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Features.Bays;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Persistence.Bays;

public sealed class BayRepository : IBayRepository
{
    private readonly string _connectionString;

    public BayRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<IReadOnlyList<BayListItemDto>> ListAsync(Guid tenantId, string? status, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT id AS Id, name AS Name, description AS Description,
                   status::text AS Status, sort_order AS SortOrder, created_at AS CreatedAt
            FROM app.bays
            WHERE tenant_id = @TenantId
              AND (@Status IS NULL OR status::text = @Status)
            ORDER BY sort_order ASC, name ASC
            """;

        var rows = await conn.QueryAsync<BayRow>(sql, new { TenantId = tenantId, Status = status });

        return rows.Select(r => new BayListItemDto(
            r.Id, r.Name, r.Description, r.Status, r.SortOrder, r.CreatedAt)).ToList();
    }

    public async Task<BayDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT id AS Id, name AS Name, description AS Description,
                   status::text AS Status, sort_order AS SortOrder, created_at AS CreatedAt
            FROM app.bays
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<BayRow>(sql, new { TenantId = tenantId, Id = id });

        if (row is null)
            return null;

        return new BayDetailDto(row.Id, row.Name, row.Description, row.Status, row.SortOrder, row.CreatedAt);
    }

    public async Task<BayCreateResult> CreateAsync(Guid tenantId, string name, string? description, int sortOrder, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            INSERT INTO app.bays (tenant_id, name, description, sort_order)
            VALUES (@TenantId, @Name, @Description, @SortOrder)
            RETURNING id
            """;

        try
        {
            var id = await conn.ExecuteScalarAsync<Guid>(sql, new
            {
                TenantId = tenantId,
                Name = name,
                Description = description,
                SortOrder = sortOrder
            });

            return new BayCreateResult(id, false);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            return new BayCreateResult(Guid.Empty, true);
        }
    }

    public async Task<BayUpdateResult> UpdateAsync(Guid tenantId, Guid id, string name, string? description, int sortOrder, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.bays
            SET name = @Name,
                description = @Description,
                sort_order = @SortOrder
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        try
        {
            var affected = await conn.ExecuteAsync(sql, new
            {
                TenantId = tenantId,
                Id = id,
                Name = name,
                Description = description,
                SortOrder = sortOrder
            });

            return new BayUpdateResult(affected > 0, false);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            return new BayUpdateResult(false, true);
        }
    }

    public async Task<BayStatusUpdateResult> UpdateStatusAsync(Guid tenantId, Guid id, string newStatus, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.bays
            SET status = @NewStatus::app.bay_status
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            Id = id,
            NewStatus = newStatus
        });

        if (affected > 0)
            return new BayStatusUpdateResult(Found: true);

        return new BayStatusUpdateResult(Found: false);
    }

    private sealed record BayRow
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = default!;
        public string? Description { get; init; }
        public string Status { get; init; } = default!;
        public int SortOrder { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
