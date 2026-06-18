using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Customers.SearchCustomers;

public sealed class SearchCustomersQueryHandler : IRequestHandler<SearchCustomersQuery, PaginatedResult<CustomerListItemDto>>
{
    private readonly ICustomerRepository _repository;
    private readonly ITenantContext _tenantContext;

    public SearchCustomersQueryHandler(ICustomerRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<PaginatedResult<CustomerListItemDto>> Handle(SearchCustomersQuery query, CancellationToken ct)
    {
        return await _repository.SearchAsync(
            _tenantContext.TenantId,
            query.Search,
            query.Page,
            query.PageSize,
            ct);
    }
}
