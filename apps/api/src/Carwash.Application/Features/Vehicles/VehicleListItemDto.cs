namespace Carwash.Application.Features.Vehicles;

public sealed record VehicleListItemDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    string? Plate,
    string Make,
    string Model,
    int? Year,
    string? Color,
    DateTime CreatedAt);
