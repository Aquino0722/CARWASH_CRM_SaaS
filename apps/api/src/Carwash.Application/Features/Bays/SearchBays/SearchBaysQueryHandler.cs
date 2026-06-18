using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Bays.SearchBays;

public sealed class SearchBaysQueryHandler : IRequestHandler<SearchBaysQuery, IReadOnlyList<BayListItemDto>>
{
    private readonly IBayRepository _repository;
    private readonly ITenantContext _tenantContext;

    public SearchBaysQueryHandler(IBayRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<IReadOnlyList<BayListItemDto>> Handle(SearchBaysQuery query, CancellationToken ct)
    {
        return await _repository.ListAsync(_tenantContext.TenantId, query.Status, ct);
    }
}
