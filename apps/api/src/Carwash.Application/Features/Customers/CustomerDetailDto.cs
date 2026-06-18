using System.Text.Json.Serialization;

namespace Carwash.Application.Features.Customers;

public sealed record CustomerDetailDto(
    Guid Id,
    string FullName,
    string? PhoneE164,
    string? Email,
    string? Notes,
    [property: JsonConverter(typeof(TagsJsonConverter))]
    IReadOnlyList<string> Tags,
    bool WhatsAppConsent,
    Guid? CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt);
