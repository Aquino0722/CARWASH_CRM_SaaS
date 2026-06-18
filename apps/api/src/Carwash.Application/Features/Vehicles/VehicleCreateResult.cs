namespace Carwash.Application.Features.Vehicles;

public sealed record VehicleCreateResult(Guid Id, bool IsDuplicatePlate);
