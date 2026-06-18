namespace Carwash.Application.Features.ServiceOrders;

public sealed record ServiceOrderListItemDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    Guid VehicleId,
    string? Plate,
    string? VehicleMake,
    string? VehicleModel,
    string Status,
    string Title,
    string? PackageName,
    decimal? EstimatedPrice,
    DateTime? ScheduledAt,
    DateTime CreatedAt);
