using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.SearchServiceOrders;

public sealed class SearchServiceOrdersQueryHandler
    : IRequestHandler<SearchServiceOrdersQuery, PaginatedResult<ServiceOrderListItemDto>>
{
    private readonly IServiceOrderRepository _repository;
    private readonly ITenantContext _tenantContext;

    public SearchServiceOrdersQueryHandler(IServiceOrderRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<PaginatedResult<ServiceOrderListItemDto>> Handle(
        SearchServiceOrdersQuery query, CancellationToken ct)
    {
        return await _repository.SearchAsync(
            _tenantContext.TenantId,
            query.Search,
            query.Status,
            query.From,
            query.To,
            query.Page,
            query.PageSize,
            ct);
    }
}
