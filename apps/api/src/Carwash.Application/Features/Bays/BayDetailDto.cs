namespace Carwash.Application.Features.Bays;

public sealed record BayDetailDto(
    Guid Id,
    string Name,
    string? Description,
    string Status,
    int SortOrder,
    DateTime CreatedAt);
