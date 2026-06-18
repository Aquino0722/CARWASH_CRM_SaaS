using MediatR;

namespace Carwash.Application.Features.Bays.UpdateBayStatus;

public sealed record UpdateBayStatusCommand(
    Guid Id,
    string Status
) : IRequest<BayStatusUpdateResult>;
