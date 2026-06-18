namespace Carwash.Application.Features.WorkItems;

public sealed record WorkItemMoveResult(
    bool Found = true,
    bool Conflict = false
);
