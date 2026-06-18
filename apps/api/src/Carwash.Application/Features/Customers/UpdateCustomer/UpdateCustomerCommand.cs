using MediatR;

namespace Carwash.Application.Features.Customers.UpdateCustomer;

public sealed record UpdateCustomerCommand(
    Guid Id,
    string FullName,
    string? PhoneE164,
    string? Email,
    string? Notes,
    List<string>? Tags,
    bool? WhatsAppConsent
) : IRequest<bool>;
