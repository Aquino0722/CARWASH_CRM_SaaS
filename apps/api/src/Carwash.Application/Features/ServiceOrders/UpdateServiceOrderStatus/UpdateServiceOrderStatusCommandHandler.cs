using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrderStatus;

public sealed class UpdateServiceOrderStatusCommandHandler
    : IRequestHandler<UpdateServiceOrderStatusCommand, ServiceOrderStatusUpdateResult>
{
    private readonly IServiceOrderRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateServiceOrderStatusCommandHandler(
        IServiceOrderRepository repository,
        ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<ServiceOrderStatusUpdateResult> Handle(
        UpdateServiceOrderStatusCommand command, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;

        var order = await _repository.GetByIdAsync(tenantId, command.Id, ct);
        if (order is null)
            return new ServiceOrderStatusUpdateResult(Found: false);

        if (!ServiceOrderStatusTransition.IsValidStatus(command.Status))
            return new ServiceOrderStatusUpdateResult(Found: true, InvalidStatus: true);

        if (!ServiceOrderStatusTransition.IsValidTransition(order.Status, command.Status))
            return new ServiceOrderStatusUpdateResult(Found: true, InvalidTransition: true);

        return await _repository.UpdateStatusAsync(
            tenantId, command.Id, command.CurrentVersion, command.Status, ct);
    }
}
