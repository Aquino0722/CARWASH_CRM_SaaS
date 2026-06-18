using FluentValidation;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrderStatus;

public sealed class UpdateServiceOrderStatusValidator : AbstractValidator<UpdateServiceOrderStatusCommand>
{
    public UpdateServiceOrderStatusValidator()
    {
        RuleFor(x => x.CurrentVersion)
            .GreaterThan(0);

        RuleFor(x => x.Status)
            .NotEmpty()
            .MaximumLength(50);
    }
}
