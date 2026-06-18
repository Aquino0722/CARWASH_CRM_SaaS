using Carwash.Application.Features.ServiceOrders;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrder;

public sealed record UpdateServiceOrderCommand(
    Guid Id,
    int CurrentVersion,
    string Title,
    string? PackageName,
    decimal? EstimatedPrice,
    decimal? FinalPrice,
    DateTime? ScheduledAt,
    DateTime? DueAt,
    string? InternalNotes,
    string? CustomerNotes
) : IRequest<ServiceOrderUpdateResult>;
