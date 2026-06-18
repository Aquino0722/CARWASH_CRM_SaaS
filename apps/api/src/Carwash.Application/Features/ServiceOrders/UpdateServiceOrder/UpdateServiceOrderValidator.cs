using FluentValidation;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrder;

public sealed class UpdateServiceOrderValidator : AbstractValidator<UpdateServiceOrderCommand>
{
    public UpdateServiceOrderValidator()
    {
        RuleFor(x => x.CurrentVersion)
            .GreaterThan(0);

        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.PackageName)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.PackageName));

        RuleFor(x => x.EstimatedPrice)
            .GreaterThan(0)
            .When(x => x.EstimatedPrice.HasValue);

        RuleFor(x => x.FinalPrice)
            .GreaterThan(0)
            .When(x => x.FinalPrice.HasValue);

        RuleFor(x => x.InternalNotes)
            .MaximumLength(2000)
            .When(x => !string.IsNullOrWhiteSpace(x.InternalNotes));

        RuleFor(x => x.CustomerNotes)
            .MaximumLength(2000)
            .When(x => !string.IsNullOrWhiteSpace(x.CustomerNotes));
    }
}
