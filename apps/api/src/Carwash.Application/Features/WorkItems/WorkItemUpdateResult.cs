namespace Carwash.Application.Features.WorkItems;

public sealed record WorkItemUpdateResult(
    bool Found = true,
    bool Conflict = false
);
