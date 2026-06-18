namespace Carwash.Application.Features.WorkItems;

public sealed record WorkItemStatusUpdateResult(
    bool Found = true,
    bool Conflict = false,
    bool InvalidStatus = false
);
