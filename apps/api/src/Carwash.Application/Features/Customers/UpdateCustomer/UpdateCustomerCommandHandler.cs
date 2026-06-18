using System.Text.Json;
using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Customers.UpdateCustomer;

public sealed class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, bool>
{
    private readonly ICustomerRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateCustomerCommandHandler(ICustomerRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<bool> Handle(UpdateCustomerCommand command, CancellationToken ct)
    {
        var tagsJson = JsonSerializer.Serialize(command.Tags ?? []);
        return await _repository.UpdateAsync(
            _tenantContext.TenantId,
            command.Id,
            command.FullName,
            command.PhoneE164,
            command.Email,
            command.Notes,
            tagsJson,
            command.WhatsAppConsent ?? false,
            ct);
    }
}
