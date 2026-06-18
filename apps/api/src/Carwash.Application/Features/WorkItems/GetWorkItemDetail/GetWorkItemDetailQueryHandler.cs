using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.WorkItems.GetWorkItemDetail;

public sealed class GetWorkItemDetailQueryHandler
    : IRequestHandler<GetWorkItemDetailQuery, WorkItemDetailDto?>
{
    private readonly IWorkItemRepository _repository;
    private readonly ITenantContext _tenantContext;

    public GetWorkItemDetailQueryHandler(IWorkItemRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<WorkItemDetailDto?> Handle(GetWorkItemDetailQuery query, CancellationToken ct)
    {
        return await _repository.GetByIdAsync(_tenantContext.TenantId, query.Id, ct);
    }
}
