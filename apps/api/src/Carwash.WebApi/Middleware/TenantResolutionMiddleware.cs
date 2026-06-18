using System.Net;
using System.Text.Json;
using Carwash.Application.Abstractions;
using Carwash.WebApi.Models;
using Carwash.WebApi.Security;

namespace Carwash.WebApi.Middleware;

public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IUserContext userContext,
        ITenantMembershipValidator validator)
    {
        var correlationId = context.Items["CorrelationId"] as string ?? "unknown";

        if (!context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdHeader))
        {
            await _next(context);
            return;
        }

        var tenantIdValue = tenantIdHeader.ToString();

        if (!Guid.TryParse(tenantIdValue, out var tenantId))
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";
            var badRequest = new ApiErrorResponse(
                "INVALID_TENANT_ID",
                "X-Tenant-Id header must be a valid UUID.",
                correlationId
            );
            await context.Response.WriteAsync(JsonSerializer.Serialize(badRequest, JsonSerializerOptions.Default));
            return;
        }

        if (!userContext.IsAuthenticated)
        {
            await _next(context);
            return;
        }

        var result = await validator.ValidateAsync(tenantId, userContext.UserId);

        if (!result.IsValid)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            context.Response.ContentType = "application/json";
            var forbidden = new ApiErrorResponse(
                "FORBIDDEN_TENANT",
                "You do not have an active membership for this tenant.",
                correlationId
            );
            await context.Response.WriteAsync(JsonSerializer.Serialize(forbidden, JsonSerializerOptions.Default));
            return;
        }

        context.Items["TenantId"] = tenantId;
        context.Items["TenantRole"] = result.Role;

        var tenantContext = new CurrentTenantContext
        {
            TenantId = tenantId,
            Role = result.Role ?? string.Empty
        };

        context.Items["TenantContext"] = tenantContext;

        await _next(context);
    }
}