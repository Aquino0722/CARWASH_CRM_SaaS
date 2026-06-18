using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Vehicles.UpdateVehicle;

public sealed class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, VehicleUpdateResult>
{
    private readonly IVehicleRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateVehicleCommandHandler(IVehicleRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<VehicleUpdateResult> Handle(UpdateVehicleCommand command, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;

        var customerExists = await _repository.CustomerBelongsToTenantAsync(tenantId, command.CustomerId, ct);
        if (!customerExists)
            return new VehicleUpdateResult(false, false);

        var plate = command.Plate?.Trim();
        var vin = command.Vin?.Trim();
        var make = command.Make.Trim();
        var model = command.Model.Trim();
        var color = command.Color?.Trim();
        var trim = command.Trim?.Trim();
        var notes = command.Notes?.Trim();

        return await _repository.UpdateAsync(
            tenantId, command.Id, command.CustomerId, make, model,
            plate, vin, command.Year, color, trim, notes, ct);
    }
}
