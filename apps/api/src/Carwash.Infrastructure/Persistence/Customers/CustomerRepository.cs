using System.Text.Json;
using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using Carwash.Application.Features.Customers;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Persistence.Customers;

public sealed class CustomerRepository : ICustomerRepository
{
    private readonly string _connectionString;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public CustomerRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<PaginatedResult<CustomerListItemDto>> SearchAsync(
        Guid tenantId, string? search, int page, int pageSize, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var countSql = """
            SELECT COUNT(*)
            FROM app.customers
            WHERE tenant_id = @TenantId
              AND (@Search IS NULL OR
                   full_name ILIKE '%' || @Search || '%' OR
                   phone_e164 ILIKE '%' || @Search || '%' OR
                   email ILIKE '%' || @Search || '%')
            """;

        var total = await conn.ExecuteScalarAsync<int>(countSql, new { TenantId = tenantId, Search = search });

        var dataSql = """
            SELECT id AS Id, full_name AS FullName, phone_e164 AS PhoneE164,
                   email AS Email, tags::text AS TagsJson,
                   whatsapp_consent AS WhatsAppConsent, created_at AS CreatedAt
            FROM app.customers
            WHERE tenant_id = @TenantId
              AND (@Search IS NULL OR
                   full_name ILIKE '%' || @Search || '%' OR
                   phone_e164 ILIKE '%' || @Search || '%' OR
                   email ILIKE '%' || @Search || '%')
            ORDER BY created_at DESC
            LIMIT @PageSize OFFSET @Offset
            """;

        var rows = await conn.QueryAsync<CustomerRow>(dataSql, new
        {
            TenantId = tenantId,
            Search = search,
            PageSize = pageSize,
            Offset = (page - 1) * pageSize
        });

        var items = rows.Select(MapToListItem).ToList();
        return new PaginatedResult<CustomerListItemDto>(items.AsReadOnly(), page, pageSize, total);
    }

    public async Task<CustomerDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            SELECT id AS Id, full_name AS FullName, phone_e164 AS PhoneE164,
                   email AS Email, notes AS Notes, tags::text AS TagsJson,
                   whatsapp_consent AS WhatsAppConsent,
                   created_by AS CreatedBy, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM app.customers
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        var row = await conn.QuerySingleOrDefaultAsync<CustomerDetailRow>(sql, new { TenantId = tenantId, Id = id });

        return row is null ? null : MapToDetail(row);
    }

    public async Task<Guid> CreateAsync(
        Guid tenantId, string fullName, string? phoneE164, string? email,
        string? notes, string? tagsJson, bool whatsappConsent,
        Guid createdBy, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            INSERT INTO app.customers (tenant_id, full_name, phone_e164, email, notes, tags, whatsapp_consent, created_by)
            VALUES (@TenantId, @FullName, @PhoneE164, @Email, @Notes, @Tags::jsonb, @WhatsAppConsent, @CreatedBy)
            RETURNING id
            """;

        var id = await conn.ExecuteScalarAsync<Guid>(sql, new
        {
            TenantId = tenantId,
            FullName = fullName,
            PhoneE164 = phoneE164,
            Email = email,
            Notes = notes,
            Tags = tagsJson ?? "[]",
            WhatsAppConsent = whatsappConsent,
            CreatedBy = createdBy
        });

        return id;
    }

    public async Task<bool> UpdateAsync(
        Guid tenantId, Guid id, string fullName, string? phoneE164, string? email,
        string? notes, string? tagsJson, bool whatsappConsent,
        CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            UPDATE app.customers
            SET full_name = @FullName,
                phone_e164 = @PhoneE164,
                email = @Email,
                notes = @Notes,
                tags = @Tags::jsonb,
                whatsapp_consent = @WhatsAppConsent,
                updated_at = NOW()
            WHERE tenant_id = @TenantId AND id = @Id
            """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            TenantId = tenantId,
            Id = id,
            FullName = fullName,
            PhoneE164 = phoneE164,
            Email = email,
            Notes = notes,
            Tags = tagsJson ?? "[]",
            WhatsAppConsent = whatsappConsent
        });

        return affected > 0;
    }

    private static CustomerListItemDto MapToListItem(CustomerRow row)
    {
        return new CustomerListItemDto(
            row.Id,
            row.FullName,
            row.PhoneE164,
            row.Email,
            DeserializeTags(row.TagsJson),
            row.WhatsAppConsent,
            row.CreatedAt);
    }

    private static CustomerDetailDto MapToDetail(CustomerDetailRow row)
    {
        return new CustomerDetailDto(
            row.Id,
            row.FullName,
            row.PhoneE164,
            row.Email,
            row.Notes,
            DeserializeTags(row.TagsJson),
            row.WhatsAppConsent,
            row.CreatedBy,
            row.CreatedAt,
            row.UpdatedAt);
    }

    private static IReadOnlyList<string> DeserializeTags(string? tagsJson)
    {
        if (string.IsNullOrWhiteSpace(tagsJson))
            return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(tagsJson, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private sealed record CustomerRow
    {
        public Guid Id { get; init; }
        public string FullName { get; init; } = default!;
        public string? PhoneE164 { get; init; }
        public string? Email { get; init; }
        public string? TagsJson { get; init; }
        public bool WhatsAppConsent { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    private sealed record CustomerDetailRow
    {
        public Guid Id { get; init; }
        public string FullName { get; init; } = default!;
        public string? PhoneE164 { get; init; }
        public string? Email { get; init; }
        public string? Notes { get; init; }
        public string? TagsJson { get; init; }
        public bool WhatsAppConsent { get; init; }
        public Guid? CreatedBy { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
}
