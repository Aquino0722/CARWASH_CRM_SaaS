using MediatR;

namespace Carwash.Application.Features.Customers.CreateCustomer;

public sealed record CreateCustomerCommand(
    string FullName,
    string? PhoneE164,
    string? Email,
    string? Notes,
    List<string>? Tags,
    bool? WhatsAppConsent
) : IRequest<Guid>;
