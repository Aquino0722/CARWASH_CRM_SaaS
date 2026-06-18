using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Bays.GetBayDetail;

public sealed class GetBayDetailQueryHandler : IRequestHandler<GetBayDetailQuery, BayDetailDto?>
{
    private readonly IBayRepository _repository;
    private readonly ITenantContext _tenantContext;

    public GetBayDetailQueryHandler(IBayRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<BayDetailDto?> Handle(GetBayDetailQuery query, CancellationToken ct)
    {
        return await _repository.GetByIdAsync(_tenantContext.TenantId, query.Id, ct);
    }
}
