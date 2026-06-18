using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrder;

public sealed class UpdateServiceOrderCommandHandler
    : IRequestHandler<UpdateServiceOrderCommand, ServiceOrderUpdateResult>
{
    private readonly IServiceOrderRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateServiceOrderCommandHandler(
        IServiceOrderRepository repository,
        ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<ServiceOrderUpdateResult> Handle(UpdateServiceOrderCommand command, CancellationToken ct)
    {
        return await _repository.UpdateAsync(
            _tenantContext.TenantId,
            command.Id,
            command.CurrentVersion,
            command.Title,
            command.PackageName,
            command.EstimatedPrice,
            command.FinalPrice,
            command.ScheduledAt,
            command.DueAt,
            command.InternalNotes,
            command.CustomerNotes,
            ct);
    }
}
