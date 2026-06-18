using Carwash.Application.Abstractions.Persistence;
using Dapper;
using Npgsql;

namespace Carwash.Infrastructure.Persistence.Outbox;

public sealed class OutboxRepository : IOutboxRepository
{
    private readonly string _connectionString;

    public OutboxRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<OutboxInsertResult> InsertAsync(OutboxMessageRow row, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);

        var sql = """
            INSERT INTO internal.message_outbox
                (tenant_id, channel, recipient_phone_e164, template_key,
                 payload, idempotency_key, max_attempts, scheduled_at)
            VALUES
                (@TenantId, @Channel, @RecipientPhoneE164, @TemplateKey,
                 @Payload::jsonb, @IdempotencyKey, @MaxAttempts, @ScheduledAt)
            ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
            RETURNING id
            """;

        var id = await conn.ExecuteScalarAsync<Guid?>(sql, new
        {
            row.TenantId,
            row.Channel,
            row.RecipientPhoneE164,
            row.TemplateKey,
            row.Payload,
            row.IdempotencyKey,
            row.MaxAttempts,
            ScheduledAt = row.ScheduledAt ?? DateTime.UtcNow
        });

        return id.HasValue
            ? new OutboxInsertResult(OutboxInsertResultType.Inserted, id)
            : new OutboxInsertResult(OutboxInsertResultType.AlreadyExists, null);
    }
}
