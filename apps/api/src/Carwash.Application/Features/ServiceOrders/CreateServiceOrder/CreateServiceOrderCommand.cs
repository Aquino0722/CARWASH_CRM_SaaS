using MediatR;

namespace Carwash.Application.Features.ServiceOrders.CreateServiceOrder;

public sealed record CreateServiceOrderCommand(
    Guid CustomerId,
    Guid VehicleId,
    string Title,
    string? PackageName,
    decimal? EstimatedPrice,
    DateTime? ScheduledAt,
    DateTime? DueAt,
    string? InternalNotes,
    string? CustomerNotes
) : IRequest<Guid>;
