using MediatR;

namespace Carwash.Application.Features.Vehicles.UpdateVehicle;

public sealed record UpdateVehicleCommand(
    Guid Id,
    Guid CustomerId,
    string Make,
    string Model,
    string? Plate,
    string? Vin,
    int? Year,
    string? Color,
    string? Trim,
    string? Notes
) : IRequest<VehicleUpdateResult>;
