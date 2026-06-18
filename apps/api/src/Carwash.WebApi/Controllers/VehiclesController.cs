using Carwash.Application.Features.Vehicles;
using Carwash.Application.Features.Vehicles.CreateVehicle;
using Carwash.Application.Features.Vehicles.GetVehicleDetail;
using Carwash.Application.Features.Vehicles.SearchVehicles;
using Carwash.Application.Features.Vehicles.UpdateVehicle;
using Carwash.WebApi.Filters;
using Carwash.WebApi.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Carwash.WebApi.Controllers;

[Authorize]
[RequireTenant]
[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] Guid? customerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = new SearchVehiclesQuery(search, customerId, page, pageSize);
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
        var query = new GetVehicleDetailQuery(id);
        var vehicle = await mediator.Send(query, ct);
        if (vehicle is null)
            return NotFound();
        return Ok(vehicle);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateVehicleCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(command, ct);

        if (result.IsDuplicatePlate)
        {
            var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
            return Conflict(new ApiErrorResponse(
                "DUPLICATE_PLATE",
                "A vehicle with this plate already exists in your tenant.",
                correlationId));
        }

        if (result.Id == Guid.Empty)
            return NotFound();

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, new { id = result.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateVehicleCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(command with { Id = id }, ct);

        if (result.IsDuplicatePlate)
        {
            var correlationId = HttpContext.Items["CorrelationId"] as string ?? "unknown";
            return Conflict(new ApiErrorResponse(
                "DUPLICATE_PLATE",
                "A vehicle with this plate already exists in your tenant.",
                correlationId));
        }

        if (!result.Updated)
            return NotFound();

        return NoContent();
    }
}
