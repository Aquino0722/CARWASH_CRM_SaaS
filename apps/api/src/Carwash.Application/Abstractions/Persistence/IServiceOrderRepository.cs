using Carwash.Application.Common;
using Carwash.Application.Features.ServiceOrders;

namespace Carwash.Application.Abstractions.Persistence;

public interface IServiceOrderRepository
{
    Task<PaginatedResult<ServiceOrderListItemDto>> SearchAsync(
        Guid tenantId, string? search, string? status, DateTime? from, DateTime? to,
        int page, int pageSize, CancellationToken ct);

    Task<ServiceOrderDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct);

    Task<bool> CustomerBelongsToTenantAsync(Guid tenantId, Guid customerId, CancellationToken ct);

    Task<bool> VehicleBelongsToCustomerAsync(Guid tenantId, Guid vehicleId, Guid customerId, CancellationToken ct);

    Task<Guid> CreateAsync(
        Guid tenantId, Guid customerId, Guid vehicleId, string title,
        string? packageName, decimal? estimatedPrice, DateTime? scheduledAt, DateTime? dueAt,
        string? internalNotes, string? customerNotes,
        Guid createdBy, CancellationToken ct);

    Task<ServiceOrderUpdateResult> UpdateAsync(
        Guid tenantId, Guid id, int currentVersion,
        string title, string? packageName, decimal? estimatedPrice, decimal? finalPrice,
        DateTime? scheduledAt, DateTime? dueAt,
        string? internalNotes, string? customerNotes,
        CancellationToken ct);

    Task<ServiceOrderStatusUpdateResult> UpdateStatusAsync(
        Guid tenantId, Guid id, int currentVersion,
        string newStatus,
        CancellationToken ct);

    Task<ServiceOrderDeliveryNotificationData?> GetDeliveryNotificationDataAsync(
        Guid tenantId, Guid id, CancellationToken ct);

    Task<ServiceOrderStatusUpdateResult> UpdateStatusAndEnqueueAsync(
        Guid tenantId, Guid id, int currentVersion, string newStatus,
        OutboxMessageRow outboxMessage, CancellationToken ct);
}
