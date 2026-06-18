using FluentValidation;

namespace Carwash.Application.Features.Bays.UpdateBayStatus;

public sealed class UpdateBayStatusValidator : AbstractValidator<UpdateBayStatusCommand>
{
    public UpdateBayStatusValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .MaximumLength(50);
    }
}
