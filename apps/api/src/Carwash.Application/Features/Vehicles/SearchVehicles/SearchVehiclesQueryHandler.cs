using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using MediatR;

namespace Carwash.Application.Features.Vehicles.SearchVehicles;

public sealed class SearchVehiclesQueryHandler : IRequestHandler<SearchVehiclesQuery, PaginatedResult<VehicleListItemDto>>
{
    private readonly IVehicleRepository _repository;
    private readonly ITenantContext _tenantContext;

    public SearchVehiclesQueryHandler(IVehicleRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<PaginatedResult<VehicleListItemDto>> Handle(SearchVehiclesQuery query, CancellationToken ct)
    {
        return await _repository.SearchAsync(
            _tenantContext.TenantId,
            query.Search,
            query.CustomerId,
            query.Page,
            query.PageSize,
            ct);
    }
}
