using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Carwash.Application.Abstractions;

namespace Carwash.WebApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get(
        [FromServices] IUserContext user,
        [FromServices] ITenantContext tenant)
    {
        return Ok(new
        {
            userId = user.UserId,
            email = user.Email,
            tenant = tenant.TenantId != Guid.Empty
                ? new { tenantId = tenant.TenantId, role = tenant.Role }
                : null
        });
    }
}