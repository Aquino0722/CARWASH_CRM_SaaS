using MediatR;

namespace Carwash.Application.Features.WorkItems.CreateWorkItem;

public sealed record CreateWorkItemCommand(
    Guid ServiceOrderId,
    string Title,
    Guid? BayId,
    decimal? Position,
    Guid? AssignedTo,
    string? Checklist
) : IRequest<Guid>;
