using System.Text.Json.Serialization;

namespace Carwash.Application.Features.Customers;

public sealed record CustomerListItemDto(
    Guid Id,
    string FullName,
    string? PhoneE164,
    string? Email,
    [property: JsonConverter(typeof(TagsJsonConverter))]
    IReadOnlyList<string> Tags,
    bool WhatsAppConsent,
    DateTime CreatedAt);
