using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Vehicles.GetVehicleDetail;

public sealed class GetVehicleDetailQueryHandler : IRequestHandler<GetVehicleDetailQuery, VehicleDetailDto?>
{
    private readonly IVehicleRepository _repository;
    private readonly ITenantContext _tenantContext;

    public GetVehicleDetailQueryHandler(IVehicleRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<VehicleDetailDto?> Handle(GetVehicleDetailQuery query, CancellationToken ct)
    {
        return await _repository.GetByIdAsync(_tenantContext.TenantId, query.Id, ct);
    }
}
