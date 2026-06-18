using FluentValidation;

namespace Carwash.Application.Features.WorkItems.MoveWorkItem;

public sealed class MoveWorkItemValidator : AbstractValidator<MoveWorkItemCommand>
{
    public MoveWorkItemValidator()
    {
        RuleFor(x => x.CurrentVersion)
            .GreaterThan(0);
    }
}
