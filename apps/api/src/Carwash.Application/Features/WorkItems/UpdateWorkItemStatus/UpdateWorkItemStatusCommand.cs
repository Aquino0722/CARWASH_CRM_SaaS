using Carwash.Application.Features.WorkItems;
using MediatR;

namespace Carwash.Application.Features.WorkItems.UpdateWorkItemStatus;

public sealed record UpdateWorkItemStatusCommand(
    Guid Id,
    int CurrentVersion,
    string Status
) : IRequest<WorkItemStatusUpdateResult>;
