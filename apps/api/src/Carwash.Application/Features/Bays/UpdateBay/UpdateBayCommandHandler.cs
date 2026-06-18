using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Bays.UpdateBay;

public sealed class UpdateBayCommandHandler : IRequestHandler<UpdateBayCommand, BayUpdateResult>
{
    private readonly IBayRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateBayCommandHandler(IBayRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<BayUpdateResult> Handle(UpdateBayCommand command, CancellationToken ct)
    {
        return await _repository.UpdateAsync(
            _tenantContext.TenantId,
            command.Id,
            command.Name,
            command.Description,
            command.SortOrder ?? 0,
            ct);
    }
}
