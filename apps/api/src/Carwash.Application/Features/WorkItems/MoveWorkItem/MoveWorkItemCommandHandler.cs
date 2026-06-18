using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.WorkItems.MoveWorkItem;

public sealed class MoveWorkItemCommandHandler
    : IRequestHandler<MoveWorkItemCommand, WorkItemMoveResult>
{
    private readonly IWorkItemRepository _repository;
    private readonly ITenantContext _tenantContext;

    public MoveWorkItemCommandHandler(IWorkItemRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<WorkItemMoveResult> Handle(MoveWorkItemCommand command, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;

        if (command.BayId.HasValue &&
            !await _repository.BayBelongsToTenantAsync(tenantId, command.BayId.Value, ct))
            return new WorkItemMoveResult(Found: false);

        return await _repository.MoveAsync(
            tenantId,
            command.Id,
            command.CurrentVersion,
            command.BayId,
            command.Position,
            ct);
    }
}
