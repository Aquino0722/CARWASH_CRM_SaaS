using System.Data;
using Carwash.Application.Abstractions;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Security;

public sealed class TenantMembershipValidator : ITenantMembershipValidator
{
    private readonly string _connectionString;

    public TenantMembershipValidator(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<TenantMembershipResult> ValidateAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT role
            FROM app.tenant_memberships
            WHERE tenant_id = @TenantId
              AND user_id = @UserId
              AND status = 'active'
            LIMIT 1
            """;

        var role = await connection.QuerySingleOrDefaultAsync<string>(
            new CommandDefinition(sql, new { TenantId = tenantId, UserId = userId }, cancellationToken: cancellationToken));

        return new TenantMembershipResult(
            IsValid: role is not null,
            Role: role
        );
    }
}