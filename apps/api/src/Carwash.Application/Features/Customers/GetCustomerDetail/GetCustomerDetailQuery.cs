using MediatR;

namespace Carwash.Application.Features.Customers.GetCustomerDetail;

public sealed record GetCustomerDetailQuery(Guid Id) : IRequest<CustomerDetailDto?>;
