using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Common;
using MediatR;

namespace Carwash.Application.Features.WorkItems.SearchWorkItems;

public sealed class SearchWorkItemsQueryHandler
    : IRequestHandler<SearchWorkItemsQuery, PaginatedResult<WorkItemListItemDto>>
{
    private readonly IWorkItemRepository _repository;
    private readonly ITenantContext _tenantContext;

    public SearchWorkItemsQueryHandler(IWorkItemRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<PaginatedResult<WorkItemListItemDto>> Handle(SearchWorkItemsQuery query, CancellationToken ct)
    {
        return await _repository.SearchAsync(
            _tenantContext.TenantId,
            query.ServiceOrderId,
            query.BayId,
            query.Status,
            query.Page,
            query.PageSize,
            ct);
    }
}
