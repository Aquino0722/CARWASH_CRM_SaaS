using System.Text.Json;
using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.Customers.CreateCustomer;

public sealed class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, Guid>
{
    private readonly ICustomerRepository _repository;
    private readonly IUserContext _userContext;
    private readonly ITenantContext _tenantContext;

    public CreateCustomerCommandHandler(
        ICustomerRepository repository,
        IUserContext userContext,
        ITenantContext tenantContext)
    {
        _repository = repository;
        _userContext = userContext;
        _tenantContext = tenantContext;
    }

    public async Task<Guid> Handle(CreateCustomerCommand command, CancellationToken ct)
    {
        var tagsJson = JsonSerializer.Serialize(command.Tags ?? []);
        return await _repository.CreateAsync(
            _tenantContext.TenantId,
            command.FullName,
            command.PhoneE164,
            command.Email,
            command.Notes,
            tagsJson,
            command.WhatsAppConsent ?? false,
            _userContext.UserId,
            ct);
    }
}
