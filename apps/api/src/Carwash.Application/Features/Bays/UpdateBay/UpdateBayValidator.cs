using FluentValidation;

namespace Carwash.Application.Features.Bays.UpdateBay;

public sealed class UpdateBayValidator : AbstractValidator<UpdateBayCommand>
{
    public UpdateBayValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .When(x => !string.IsNullOrWhiteSpace(x.Description));
    }
}
