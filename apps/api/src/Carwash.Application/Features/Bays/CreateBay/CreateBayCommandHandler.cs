using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Bays.CreateBay;

public sealed class CreateBayCommandHandler : IRequestHandler<CreateBayCommand, BayCreateResult>
{
    private readonly IBayRepository _repository;
    private readonly ITenantContext _tenantContext;

    public CreateBayCommandHandler(IBayRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<BayCreateResult> Handle(CreateBayCommand command, CancellationToken ct)
    {
        return await _repository.CreateAsync(
            _tenantContext.TenantId,
            command.Name,
            command.Description,
            command.SortOrder ?? 0,
            ct);
    }
}
