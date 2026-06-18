using FluentValidation;

namespace Carwash.Application.Features.Customers.UpdateCustomer;

public sealed class UpdateCustomerValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.PhoneE164)
            .MaximumLength(20)
            .Matches(@"^\+[1-9]\d{6,14}$")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneE164));

        RuleFor(x => x.Email)
            .MaximumLength(320)
            .EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Notes)
            .MaximumLength(2000)
            .When(x => !string.IsNullOrWhiteSpace(x.Notes));
    }
}
