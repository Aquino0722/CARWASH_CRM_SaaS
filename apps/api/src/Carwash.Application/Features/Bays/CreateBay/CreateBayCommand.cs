using MediatR;

namespace Carwash.Application.Features.Bays.CreateBay;

public sealed record CreateBayCommand(
    string Name,
    string? Description,
    int? SortOrder
) : IRequest<BayCreateResult>;
