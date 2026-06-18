using Carwash.Application.Common;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.SearchServiceOrders;

public sealed record SearchServiceOrdersQuery(
    string? Search,
    string? Status,
    DateTime? From,
    DateTime? To,
    int Page,
    int PageSize
) : IRequest<PaginatedResult<ServiceOrderListItemDto>>;
