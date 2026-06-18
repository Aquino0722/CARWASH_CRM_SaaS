namespace Carwash.Application.Features.ServiceOrders;

public sealed record ServiceOrderUpdateResult(
    bool Found = true,
    bool Conflict = false
);
