using MediatR;

namespace Carwash.Application.Features.Vehicles.CreateVehicle;

public sealed record CreateVehicleCommand(
    Guid CustomerId,
    string Make,
    string Model,
    string? Plate,
    string? Vin,
    int? Year,
    string? Color,
    string? Trim,
    string? Notes
) : IRequest<VehicleCreateResult>;
