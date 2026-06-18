using Carwash.Application.Abstractions;

namespace Carwash.WebApi.Security;

public sealed class CurrentTenantContext : ITenantContext
{
    public Guid TenantId { get; init; }
    public string Role { get; init; } = string.Empty;
}