namespace Carwash.Application.Features.WorkItems;

public static class WorkItemStatus
{
    private static readonly HashSet<string> Allowed = ["waiting", "in_progress", "completed", "blocked", "cancelled"];

    public static bool IsValidStatus(string status) => Allowed.Contains(status);
}
