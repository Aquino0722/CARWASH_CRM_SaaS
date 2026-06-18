using Carwash.Application.Features.Bays;

namespace Carwash.Application.Abstractions.Persistence;

public interface IBayRepository
{
    Task<IReadOnlyList<BayListItemDto>> ListAsync(Guid tenantId, string? status, CancellationToken ct);

    Task<BayDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct);

    Task<BayCreateResult> CreateAsync(Guid tenantId, string name, string? description, int sortOrder, CancellationToken ct);

    Task<BayUpdateResult> UpdateAsync(Guid tenantId, Guid id, string name, string? description, int sortOrder, CancellationToken ct);

    Task<BayStatusUpdateResult> UpdateStatusAsync(Guid tenantId, Guid id, string newStatus, CancellationToken ct);
}
