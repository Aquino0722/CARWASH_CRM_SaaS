namespace Carwash.Application.Features.Vehicles;

public sealed record VehicleDetailDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    string? Plate,
    string? Vin,
    string Make,
    string Model,
    int? Year,
    string? Color,
    string? Trim,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);
