using MediatR;

namespace Carwash.Application.Features.Bays.GetBayDetail;

public sealed record GetBayDetailQuery(Guid Id) : IRequest<BayDetailDto?>;
