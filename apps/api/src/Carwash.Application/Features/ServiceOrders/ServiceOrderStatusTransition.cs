namespace Carwash.Application.Features.ServiceOrders;

public static class ServiceOrderStatusTransition
{
    private static readonly Dictionary<string, HashSet<string>> AllowedTransitions = new()
    {
        ["draft"] = ["quoted", "cancelled"],
        ["quoted"] = ["scheduled", "cancelled"],
        ["scheduled"] = ["checked_in", "cancelled"],
        ["checked_in"] = ["in_progress", "cancelled"],
        ["in_progress"] = ["quality_check", "cancelled"],
        ["quality_check"] = ["ready_for_delivery", "cancelled"],
        ["ready_for_delivery"] = ["delivered", "cancelled"],
        ["delivered"] = [],
        ["cancelled"] = []
    };

    public static bool IsValidStatus(string status) =>
        AllowedTransitions.ContainsKey(status);

    public static bool IsValidTransition(string from, string to) =>
        AllowedTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);
}
