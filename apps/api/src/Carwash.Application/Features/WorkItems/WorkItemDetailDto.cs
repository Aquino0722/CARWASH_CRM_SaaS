namespace Carwash.Application.Features.WorkItems;

public sealed record WorkItemDetailDto(
    Guid Id,
    Guid ServiceOrderId,
    Guid? BayId,
    string Title,
    string Status,
    decimal Position,
    Guid? AssignedTo,
    string? Checklist,
    int Version,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt);
