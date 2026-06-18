using Carwash.Application.Features.ServiceOrders;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrderStatus;

public sealed record UpdateServiceOrderStatusCommand(
    Guid Id,
    int CurrentVersion,
    string Status
) : IRequest<ServiceOrderStatusUpdateResult>;
