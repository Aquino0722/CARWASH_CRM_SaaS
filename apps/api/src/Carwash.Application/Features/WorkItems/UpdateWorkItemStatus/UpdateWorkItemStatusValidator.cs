using FluentValidation;

namespace Carwash.Application.Features.WorkItems.UpdateWorkItemStatus;

public sealed class UpdateWorkItemStatusValidator : AbstractValidator<UpdateWorkItemStatusCommand>
{
    public UpdateWorkItemStatusValidator()
    {
        RuleFor(x => x.CurrentVersion)
            .GreaterThan(0);

        RuleFor(x => x.Status)
            .NotEmpty()
            .MaximumLength(50);
    }
}
