using System.Net;
using System.Text.Json;
using Carwash.WebApi.Models;

namespace Carwash.WebApi.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var correlationId = context.Items["CorrelationId"] as string ?? "unknown";

            _logger.LogError(ex, "Unhandled exception. CorrelationId: {CorrelationId}", correlationId);

            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new ApiErrorResponse(
                "INTERNAL_ERROR",
                "An unexpected error occurred.",
                correlationId
            );

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonSerializerOptions.Default));
        }
    }
}