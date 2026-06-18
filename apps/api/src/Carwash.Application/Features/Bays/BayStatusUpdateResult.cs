namespace Carwash.Application.Features.Bays;

public sealed record BayStatusUpdateResult(
    bool Found = true,
    bool InvalidStatus = false
);
