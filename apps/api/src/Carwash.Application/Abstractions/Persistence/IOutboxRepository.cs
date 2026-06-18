namespace Carwash.Application.Abstractions.Persistence;

public enum OutboxInsertResultType { Inserted, AlreadyExists }

public sealed record OutboxInsertResult(OutboxInsertResultType Type, Guid? Id);

public sealed record OutboxMessageRow(
    Guid TenantId,
    string Channel,
    string RecipientPhoneE164,
    string TemplateKey,
    string Payload,
    string IdempotencyKey,
    int MaxAttempts = 3,
    DateTime? ScheduledAt = null);

public interface IOutboxRepository
{
    Task<OutboxInsertResult> InsertAsync(OutboxMessageRow row, CancellationToken ct);
}
