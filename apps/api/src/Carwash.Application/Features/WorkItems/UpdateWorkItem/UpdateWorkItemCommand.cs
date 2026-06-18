using Carwash.Application.Features.WorkItems;
using MediatR;

namespace Carwash.Application.Features.WorkItems.UpdateWorkItem;

public sealed record UpdateWorkItemCommand(
    Guid Id,
    int CurrentVersion,
    string Title,
    Guid? AssignedTo,
    string? Checklist,
    DateTime? StartedAt,
    DateTime? CompletedAt
) : IRequest<WorkItemUpdateResult>;
