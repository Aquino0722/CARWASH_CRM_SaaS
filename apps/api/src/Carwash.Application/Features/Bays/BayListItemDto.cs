namespace Carwash.Application.Features.Bays;

public sealed record BayListItemDto(
    Guid Id,
    string Name,
    string? Description,
    string Status,
    int SortOrder,
    DateTime CreatedAt);
