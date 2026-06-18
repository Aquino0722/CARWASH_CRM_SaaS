using MediatR;

namespace Carwash.Application.Features.Vehicles.GetVehicleDetail;

public sealed record GetVehicleDetailQuery(Guid Id) : IRequest<VehicleDetailDto?>;
