using System.Text.Json;
using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.WorkItems.CreateWorkItem;

public sealed class CreateWorkItemCommandHandler
    : IRequestHandler<CreateWorkItemCommand, Guid>
{
    private readonly IWorkItemRepository _repository;
    private readonly ITenantContext _tenantContext;

    public CreateWorkItemCommandHandler(
        IWorkItemRepository repository,
        ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<Guid> Handle(CreateWorkItemCommand command, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;

        if (!await _repository.ServiceOrderBelongsToTenantAsync(tenantId, command.ServiceOrderId, ct))
            return Guid.Empty;

        if (command.BayId.HasValue &&
            !await _repository.BayBelongsToTenantAsync(tenantId, command.BayId.Value, ct))
            return Guid.Empty;

        var sanitizedChecklist = SerializeChecklist(command.Checklist);

        return await _repository.CreateAsync(
            tenantId,
            command.ServiceOrderId,
            command.Title,
            command.BayId,
            command.Position,
            command.AssignedTo,
            sanitizedChecklist,
            ct);
    }

    private static string SerializeChecklist(string? checklist)
    {
        if (string.IsNullOrWhiteSpace(checklist))
            return "[]";

        try
        {
            JsonDocument.Parse(checklist);
            return checklist;
        }
        catch (JsonException)
        {
            throw new FluentValidation.ValidationException("Checklist must be valid JSON.");
        }
    }
}
