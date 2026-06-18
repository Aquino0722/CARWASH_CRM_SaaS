using Carwash.Application.Common;
using MediatR;

namespace Carwash.Application.Features.Vehicles.SearchVehicles;

public sealed record SearchVehiclesQuery(
    string? Search,
    Guid? CustomerId,
    int Page,
    int PageSize
) : IRequest<PaginatedResult<VehicleListItemDto>>;
