using Microsoft.AspNetCore.Mvc;

namespace Carwash.WebApi.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet("/health")]
    public IActionResult Get()
    {
        return Ok(new { api = "ok", version = "0.1.0" });
    }
}