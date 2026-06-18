using Carwash.Application.Features.WorkItems;
using Carwash.Application.Features.WorkItems.CreateWorkItem;
using Carwash.Application.Features.WorkItems.GetWorkItemDetail;
using Carwash.Application.Features.WorkItems.MoveWorkItem;
using Carwash.Application.Features.WorkItems.SearchWorkItems;
using Carwash.Application.Features.WorkItems.UpdateWorkItem;
using Carwash.Application.Features.WorkItems.UpdateWorkItemStatus;
using Carwash.WebApi.Filters;
using Carwash.WebApi.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Carwash.WebApi.Controllers;

[Authorize]
[RequireTenant]
[ApiController]
[Route("api/work-items")]
public class WorkItemsController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? serviceOrderId,
        [FromQuery] Guid? bayId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = new SearchWorkItemsQuery(serviceOrderId, bayId, status, page, pageSize);
        var result = await mediator.Send(query, ct);
        return Ok(new
        {
            items = result.Items,
            page = result.Page,
            pageSize = result.PageSize,
            totalCount = result.TotalCount
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var query = new GetWorkItemDetailQuery(id);
        var item = await mediator.Send(query, ct);
        if (item is null)
            return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateWorkItemCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var id = await mediator.Send(command, ct);
        if (id == Guid.Empty)
            return NotFound();
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateWorkItemCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
        var result = await mediator.Send(command with { Id = id }, ct);

        if (!result.Found)
            return NotFound();

        if (result.Conflict)
            return Conflict(new ApiErrorResponse(
                "VERSION_CONFLICT",
                "The work item was modified by another user. Refresh and try again.",
                correlationId));

        return NoContent();
    }

    [HttpPatch("{id:guid}/move")]
    public async Task<IActionResult> Move(
        Guid id,
        [FromBody] MoveWorkItemCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
        var result = await mediator.Send(command with { Id = id }, ct);

        if (!result.Found)
            return NotFound();

        if (result.Conflict)
            return Conflict(new ApiErrorResponse(
                "VERSION_CONFLICT",
                "The work item was modified by another user. Refresh and try again.",
                correlationId));

        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateWorkItemStatusCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
        var result = await mediator.Send(command with { Id = id }, ct);

        if (!result.Found)
            return NotFound();

        if (result.InvalidStatus)
            return BadRequest(new ApiErrorResponse(
                "VALIDATION_ERROR",
                "Invalid work item status value.",
                correlationId));

        if (result.Conflict)
            return Conflict(new ApiErrorResponse(
                "VERSION_CONFLICT",
                "The work item was modified by another user. Refresh and try again.",
                correlationId));

        return NoContent();
    }
}
