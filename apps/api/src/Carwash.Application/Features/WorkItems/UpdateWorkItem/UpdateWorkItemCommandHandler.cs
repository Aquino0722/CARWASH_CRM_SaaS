using System.Text.Json;
using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using MediatR;

namespace Carwash.Application.Features.WorkItems.UpdateWorkItem;

public sealed class UpdateWorkItemCommandHandler
    : IRequestHandler<UpdateWorkItemCommand, WorkItemUpdateResult>
{
    private readonly IWorkItemRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateWorkItemCommandHandler(IWorkItemRepository repository, ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<WorkItemUpdateResult> Handle(UpdateWorkItemCommand command, CancellationToken ct)
    {
        var sanitizedChecklist = SerializeChecklist(command.Checklist);

        return await _repository.UpdateAsync(
            _tenantContext.TenantId,
            command.Id,
            command.CurrentVersion,
            command.Title,
            command.AssignedTo,
            sanitizedChecklist,
            command.StartedAt,
            command.CompletedAt,
            ct);
    }

    private static string? SerializeChecklist(string? checklist)
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
