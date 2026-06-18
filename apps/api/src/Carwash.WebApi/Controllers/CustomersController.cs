using Carwash.Application.Features.Customers;
using Carwash.Application.Features.Customers.CreateCustomer;
using Carwash.Application.Features.Customers.GetCustomerDetail;
using Carwash.Application.Features.Customers.SearchCustomers;
using Carwash.Application.Features.Customers.UpdateCustomer;
using Carwash.WebApi.Filters;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Carwash.WebApi.Controllers;

[Authorize]
[RequireTenant]
[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = new SearchCustomersQuery(search, page, pageSize);
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
        var query = new GetCustomerDetailQuery(id);
        var customer = await mediator.Send(query, ct);
        if (customer is null)
            return NotFound();
        return Ok(customer);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateCustomerCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var id = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCustomerCommand command,
        [FromServices] IMediator mediator = default!,
        CancellationToken ct = default)
    {
        var updated = await mediator.Send(command with { Id = id }, ct);
        if (!updated)
            return NotFound();
        return NoContent();
    }
}
