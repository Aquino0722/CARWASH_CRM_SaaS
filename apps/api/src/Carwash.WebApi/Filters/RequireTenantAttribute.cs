using Carwash.Application.Abstractions;
using Carwash.WebApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Carwash.WebApi.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireTenantAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var tenant = context.HttpContext.RequestServices.GetService<ITenantContext>();
        if (tenant is null || tenant.TenantId == Guid.Empty)
        {
            var correlationId = context.HttpContext.Items["CorrelationId"] as string ?? "unknown";
            context.Result = new ObjectResult(new ApiErrorResponse(
                "TENANT_REQUIRED",
                "X-Tenant-Id header is required for this endpoint.",
                correlationId))
            {
                StatusCode = 428
            };
            return;
        }
        await next();
    }
}
