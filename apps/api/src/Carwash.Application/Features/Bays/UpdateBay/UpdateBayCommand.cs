using MediatR;

namespace Carwash.Application.Features.Bays.UpdateBay;

public sealed record UpdateBayCommand(
    Guid Id,
    string Name,
    string? Description,
    int? SortOrder
) : IRequest<BayUpdateResult>;
