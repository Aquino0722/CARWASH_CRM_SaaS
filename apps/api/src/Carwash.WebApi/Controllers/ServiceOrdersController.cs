using Carwash.Application.Features.ServiceOrders;
using Carwash.Application.Features.ServiceOrders.CreateServiceOrder;
using Carwash.Application.Features.ServiceOrders.GetServiceOrderDetail;
using Carwash.Application.Features.ServiceOrders.SearchServiceOrders;
using Carwash.Application.Features.ServiceOrders.UpdateServiceOrder;
using Carwash.Application.Features.ServiceOrders.UpdateServiceOrderStatus;
using Carwash.WebApi.Filters;
using Carwash.WebApi.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Carwash.WebApi.Controllers;

[Authorize]
[RequireTenant]
[ApiController]
[Route("api/service-orders")]
public class ServiceOrdersController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = new SearchServiceOrdersQuery(search, status, from, to, page, pageSize);
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
        var query = new GetServiceOrderDetailQuery(id);
        var order = await mediator.Send(query, ct);
        if (order is null)
            return NotFound();
        return Ok(order);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateServiceOrderCommand command,
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
        [FromBody] UpdateServiceOrderCommand command,
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
                "The service order was modified by another user. Refresh and try again.",
                correlationId));

        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateServiceOrderStatusCommand command,
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
                "Invalid status value.",
                correlationId));

        if (result.InvalidTransition)
            return Conflict(new ApiErrorResponse(
                "INVALID_STATE_TRANSITION",
                $"Cannot transition to status '{command.Status}' from the current status.",
                correlationId));

        if (result.Conflict)
            return Conflict(new ApiErrorResponse(
                "VERSION_CONFLICT",
                "The service order was modified by another user. Refresh and try again.",
                correlationId));

        return NoContent();
    }
}
