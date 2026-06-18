namespace Carwash.Application.Abstractions;

public interface ITenantContext
{
    Guid TenantId { get; }
    string Role { get; }
}