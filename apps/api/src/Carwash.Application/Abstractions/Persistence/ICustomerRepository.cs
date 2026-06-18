using Carwash.Application.Common;
using Carwash.Application.Features.Customers;

namespace Carwash.Application.Abstractions.Persistence;

public interface ICustomerRepository
{
    Task<PaginatedResult<CustomerListItemDto>> SearchAsync(
        Guid tenantId, string? search, int page, int pageSize, CancellationToken ct);

    Task<CustomerDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct);

    Task<Guid> CreateAsync(
        Guid tenantId, string fullName, string? phoneE164, string? email,
        string? notes, string? tagsJson, bool whatsappConsent,
        Guid createdBy, CancellationToken ct);

    Task<bool> UpdateAsync(
        Guid tenantId, Guid id, string fullName, string? phoneE164, string? email,
        string? notes, string? tagsJson, bool whatsappConsent,
        CancellationToken ct);
}
