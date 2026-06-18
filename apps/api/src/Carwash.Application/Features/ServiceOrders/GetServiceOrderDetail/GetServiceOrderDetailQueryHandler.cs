using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.GetServiceOrderDetail;

public sealed class GetServiceOrderDetailQueryHandler
    : IRequestHandler<GetServiceOrderDetailQuery, ServiceOrderDetailDto?>
{
    private readonly IServiceOrderRepository _repository;
    private readonly ITenantContext _tenantContext;

    public GetServiceOrderDetailQueryHandler(IServiceOrderRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<ServiceOrderDetailDto?> Handle(GetServiceOrderDetailQuery query, CancellationToken ct)
    {
        return await _repository.GetByIdAsync(_tenantContext.TenantId, query.Id, ct);
    }
}
