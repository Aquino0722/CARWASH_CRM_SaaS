namespace Carwash.Application.Features.Bays;

public static class BayStatus
{
    private static readonly HashSet<string> Allowed = ["available", "occupied", "blocked", "maintenance"];

    public static bool IsValidStatus(string status) => Allowed.Contains(status);
}
