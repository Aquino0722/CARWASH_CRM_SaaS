using MediatR;

namespace Carwash.Application.Features.Customers.SearchCustomers;

public sealed record SearchCustomersQuery(
    string? Search,
    int Page,
    int PageSize
) : IRequest<PaginatedResult<CustomerListItemDto>>;
