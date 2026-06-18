namespace Carwash.WebApi.Models;

public sealed record ApiErrorResponse(
    string Error,
    string Message,
    string CorrelationId
);