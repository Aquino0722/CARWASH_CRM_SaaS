namespace Carwash.Application.Features.WorkItems;

public sealed record WorkItemListItemDto(
    Guid Id,
    Guid ServiceOrderId,
    Guid? BayId,
    string Title,
    string Status,
    decimal Position,
    Guid? AssignedTo,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt);
