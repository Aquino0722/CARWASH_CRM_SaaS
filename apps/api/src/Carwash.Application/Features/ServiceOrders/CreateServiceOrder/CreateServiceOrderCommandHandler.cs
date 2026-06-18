using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.CreateServiceOrder;

public sealed class CreateServiceOrderCommandHandler
    : IRequestHandler<CreateServiceOrderCommand, Guid>
{
    private readonly IServiceOrderRepository _repository;
    private readonly IUserContext _userContext;
    private readonly ITenantContext _tenantContext;

    public CreateServiceOrderCommandHandler(
        IServiceOrderRepository repository,
        IUserContext userContext,
        ITenantContext tenantContext)
    {
        _repository = repository;
        _userContext = userContext;
        _tenantContext = tenantContext;
    }

    public async Task<Guid> Handle(CreateServiceOrderCommand command, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;

        if (!await _repository.CustomerBelongsToTenantAsync(tenantId, command.CustomerId, ct))
            return Guid.Empty;

        if (!await _repository.VehicleBelongsToCustomerAsync(tenantId, command.VehicleId, command.CustomerId, ct))
            return Guid.Empty;

        return await _repository.CreateAsync(
            tenantId,
            command.CustomerId,
            command.VehicleId,
            command.Title,
            command.PackageName,
            command.EstimatedPrice,
            command.ScheduledAt,
            command.DueAt,
            command.InternalNotes,
            command.CustomerNotes,
            _userContext.UserId,
            ct);
    }
}
