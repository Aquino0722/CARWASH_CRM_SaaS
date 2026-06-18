using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Customers.GetCustomerDetail;

public sealed class GetCustomerDetailQueryHandler : IRequestHandler<GetCustomerDetailQuery, CustomerDetailDto?>
{
    private readonly ICustomerRepository _repository;
    private readonly ITenantContext _tenantContext;

    public GetCustomerDetailQueryHandler(ICustomerRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<CustomerDetailDto?> Handle(GetCustomerDetailQuery query, CancellationToken ct)
    {
        return await _repository.GetByIdAsync(_tenantContext.TenantId, query.Id, ct);
    }
}
