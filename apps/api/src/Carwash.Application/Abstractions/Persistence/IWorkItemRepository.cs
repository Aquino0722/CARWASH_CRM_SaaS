using Carwash.Application.Common;
using Carwash.Application.Features.WorkItems;

namespace Carwash.Application.Abstractions.Persistence;

public interface IWorkItemRepository
{
    Task<PaginatedResult<WorkItemListItemDto>> SearchAsync(
        Guid tenantId, Guid? serviceOrderId, Guid? bayId, string? status,
        int page, int pageSize, CancellationToken ct);

    Task<WorkItemDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct);

    Task<bool> ServiceOrderBelongsToTenantAsync(Guid tenantId, Guid serviceOrderId, CancellationToken ct);

    Task<bool> BayBelongsToTenantAsync(Guid tenantId, Guid bayId, CancellationToken ct);

    Task<Guid> CreateAsync(
        Guid tenantId, Guid serviceOrderId, string title,
        Guid? bayId, decimal? position, Guid? assignedTo, string? checklist,
        CancellationToken ct);

    Task<WorkItemUpdateResult> UpdateAsync(
        Guid tenantId, Guid id, int currentVersion,
        string title, Guid? assignedTo, string? checklist,
        DateTime? startedAt, DateTime? completedAt,
        CancellationToken ct);

    Task<WorkItemMoveResult> MoveAsync(
        Guid tenantId, Guid id, int currentVersion,
        Guid? bayId, decimal position,
        CancellationToken ct);

    Task<WorkItemStatusUpdateResult> UpdateStatusAsync(
        Guid tenantId, Guid id, int currentVersion,
        string newStatus,
        CancellationToken ct);
}
