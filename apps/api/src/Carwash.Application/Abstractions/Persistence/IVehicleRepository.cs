using Carwash.Application.Common;
using Carwash.Application.Features.Vehicles;

namespace Carwash.Application.Abstractions.Persistence;

public interface IVehicleRepository
{
    Task<PaginatedResult<VehicleListItemDto>> SearchAsync(
        Guid tenantId, string? search, Guid? customerId, int page, int pageSize, CancellationToken ct);

    Task<VehicleDetailDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct);

    Task<bool> CustomerBelongsToTenantAsync(Guid tenantId, Guid customerId, CancellationToken ct);

    Task<VehicleCreateResult> CreateAsync(
        Guid tenantId, Guid customerId, string make, string model,
        string? plate, string? vin, int? year, string? color, string? trim, string? notes,
        CancellationToken ct);

    Task<VehicleUpdateResult> UpdateAsync(
        Guid tenantId, Guid id, Guid customerId, string make, string model,
        string? plate, string? vin, int? year, string? color, string? trim, string? notes,
        CancellationToken ct);
}
