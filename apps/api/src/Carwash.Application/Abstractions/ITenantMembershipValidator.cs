namespace Carwash.Application.Abstractions;

public sealed record TenantMembershipResult(
    bool IsValid,
    string? Role
);

public interface ITenantMembershipValidator
{
    Task<TenantMembershipResult> ValidateAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);
}