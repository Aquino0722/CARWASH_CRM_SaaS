namespace Carwash.Application.Features.ServiceOrders;

public sealed record ServiceOrderDeliveryNotificationData(
    string CustomerName,
    string? CustomerPhoneE164,
    string? Plate,
    string? VehicleMake,
    string? VehicleModel);
