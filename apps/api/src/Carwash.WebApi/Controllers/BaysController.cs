using Carwash.Application.Features.Bays;
using Carwash.Application.Features.Bays.CreateBay;
using Carwash.Application.Features.Bays.GetBayDetail;
using Carwash.Application.Features.Bays.SearchBays;
using Carwash.Application.Features.Bays.UpdateBay;
using Carwash.Application.Features.Bays.UpdateBayStatus;
using Carwash.WebApi.Filters;
using Carwash.WebApi.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Carwash.WebApi.Controllers;

[Authorize]
[RequireTenant]
[ApiController]
[Route("api/bays")]
public class BaysController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var query = new SearchBaysQuery(status);
        var items = await mediator.Send(query, ct);
        return Ok(new { items });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var query = new GetBayDetailQuery(id);
        var bay = await mediator.Send(query, ct);
        if (bay is null)
            return NotFound();
        return Ok(bay);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateBayCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
        var result = await mediator.Send(command, ct);

        if (result.IsDuplicateName)
            return Conflict(new ApiErrorResponse(
                "DUPLICATE_BAY_NAME",
                "A bay with this name already exists in your tenant.",
                correlationId));

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, new { id = result.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateBayCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
        var result = await mediator.Send(command with { Id = id }, ct);

        if (result.IsDuplicateName)
            return Conflict(new ApiErrorResponse(
                "DUPLICATE_BAY_NAME",
                "A bay with this name already exists in your tenant.",
                correlationId));

        if (!result.Found)
            return NotFound();

        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateBayStatusCommand command,
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
                "Invalid bay status value.",
                correlationId));

        return NoContent();
    }
}
