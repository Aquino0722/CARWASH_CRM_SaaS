using FluentValidation;

namespace Carwash.Application.Features.Vehicles.UpdateVehicle;

public sealed class UpdateVehicleValidator : AbstractValidator<UpdateVehicleCommand>
{
    public UpdateVehicleValidator()
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty();

        RuleFor(x => x.Make)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Model)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Plate)
            .MaximumLength(20)
            .When(x => !string.IsNullOrWhiteSpace(x.Plate));

        RuleFor(x => x.Vin)
            .MaximumLength(17)
            .When(x => !string.IsNullOrWhiteSpace(x.Vin));

        RuleFor(x => x.Color)
            .MaximumLength(50)
            .When(x => !string.IsNullOrWhiteSpace(x.Color));

        RuleFor(x => x.Trim)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.Trim));

        RuleFor(x => x.Notes)
            .MaximumLength(2000)
            .When(x => !string.IsNullOrWhiteSpace(x.Notes));
    }
}
