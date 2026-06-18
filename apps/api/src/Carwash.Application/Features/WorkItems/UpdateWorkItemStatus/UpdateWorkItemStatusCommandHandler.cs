using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.WorkItems.UpdateWorkItemStatus;

public sealed class UpdateWorkItemStatusCommandHandler
    : IRequestHandler<UpdateWorkItemStatusCommand, WorkItemStatusUpdateResult>
{
    private readonly IWorkItemRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateWorkItemStatusCommandHandler(IWorkItemRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<WorkItemStatusUpdateResult> Handle(
        UpdateWorkItemStatusCommand command, CancellationToken ct)
    {
        if (!WorkItemStatus.IsValidStatus(command.Status))
            return new WorkItemStatusUpdateResult(Found: true, InvalidStatus: true);

        var item = await _repository.GetByIdAsync(_tenantContext.TenantId, command.Id, ct);
        if (item is null)
            return new WorkItemStatusUpdateResult(Found: false);

        return await _repository.UpdateStatusAsync(
            _tenantContext.TenantId, command.Id, command.CurrentVersion, command.Status, ct);
    }
}
