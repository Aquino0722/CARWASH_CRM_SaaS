using Carwash.Application.Features.WorkItems;
using MediatR;

namespace Carwash.Application.Features.WorkItems.MoveWorkItem;

public sealed record MoveWorkItemCommand(
    Guid Id,
    int CurrentVersion,
    Guid? BayId,
    decimal Position
) : IRequest<WorkItemMoveResult>;
