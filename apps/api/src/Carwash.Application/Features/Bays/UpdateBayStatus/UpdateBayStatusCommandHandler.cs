using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Bays.UpdateBayStatus;

public sealed class UpdateBayStatusCommandHandler : IRequestHandler<UpdateBayStatusCommand, BayStatusUpdateResult>
{
    private readonly IBayRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateBayStatusCommandHandler(IBayRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<BayStatusUpdateResult> Handle(UpdateBayStatusCommand command, CancellationToken ct)
    {
        if (!BayStatus.IsValidStatus(command.Status))
            return new BayStatusUpdateResult(Found: true, InvalidStatus: true);

        var bay = await _repository.GetByIdAsync(_tenantContext.TenantId, command.Id, ct);
        if (bay is null)
            return new BayStatusUpdateResult(Found: false);

        return await _repository.UpdateStatusAsync(_tenantContext.TenantId, command.Id, command.Status, ct);
    }
}
