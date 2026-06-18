using MediatR;

namespace Carwash.Application.Features.WorkItems.GetWorkItemDetail;

public sealed record GetWorkItemDetailQuery(Guid Id) : IRequest<WorkItemDetailDto?>;
