namespace Carwash.Application.Features.ServiceOrders;

public sealed record ServiceOrderStatusUpdateResult(
    bool Found = true,
    bool Conflict = false,
    bool InvalidStatus = false,
    bool InvalidTransition = false
);
