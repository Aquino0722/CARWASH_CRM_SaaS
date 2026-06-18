using System.Text.Json;
using FluentValidation;

namespace Carwash.Application.Features.WorkItems.UpdateWorkItem;

public sealed class UpdateWorkItemValidator : AbstractValidator<UpdateWorkItemCommand>
{
    public UpdateWorkItemValidator()
    {
        RuleFor(x => x.CurrentVersion)
            .GreaterThan(0);

        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Checklist)
            .Must(BeValidJson)
            .When(x => !string.IsNullOrWhiteSpace(x.Checklist))
            .WithMessage("Checklist must be valid JSON.");
    }

    private static bool BeValidJson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;
        try
        {
            JsonDocument.Parse(value);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
