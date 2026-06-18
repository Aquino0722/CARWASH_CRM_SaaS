using MediatR;

namespace Carwash.Application.Features.Bays.SearchBays;

public sealed record SearchBaysQuery(string? Status) : IRequest<IReadOnlyList<BayListItemDto>>;
