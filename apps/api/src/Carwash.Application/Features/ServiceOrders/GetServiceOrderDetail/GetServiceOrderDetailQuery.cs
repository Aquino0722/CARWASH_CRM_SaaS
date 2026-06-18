using MediatR;

namespace Carwash.Application.Features.ServiceOrders.GetServiceOrderDetail;

public sealed record GetServiceOrderDetailQuery(Guid Id) : IRequest<ServiceOrderDetailDto?>;
