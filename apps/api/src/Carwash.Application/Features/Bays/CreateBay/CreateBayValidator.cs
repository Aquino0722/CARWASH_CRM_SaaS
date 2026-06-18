using FluentValidation;

namespace Carwash.Application.Features.Bays.CreateBay;

public sealed class CreateBayValidator : AbstractValidator<CreateBayCommand>
{
    public CreateBayValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .When(x => !string.IsNullOrWhiteSpace(x.Description));
    }
}
