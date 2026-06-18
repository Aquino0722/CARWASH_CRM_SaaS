using Carwash.Application.Common;
using MediatR;

namespace Carwash.Application.Features.WorkItems.SearchWorkItems;

public sealed record SearchWorkItemsQuery(
    Guid? ServiceOrderId,
    Guid? BayId,
    string? Status,
    int Page,
    int PageSize
) : IRequest<PaginatedResult<WorkItemListItemDto>>;
