using System.Text.Json;
using Carwash.Application.Abstractions;
using Carwash.Application.Abstractions.Persistence;
using Carwash.Application.Features.ServiceOrders;
using MediatR;

namespace Carwash.Application.Features.ServiceOrders.UpdateServiceOrderStatus;

public sealed class UpdateServiceOrderStatusCommandHandler
    : IRequestHandler<UpdateServiceOrderStatusCommand, ServiceOrderStatusUpdateResult>
{
    private readonly IServiceOrderRepository _repository;
    private readonly ITenantContext _tenantContext;

    public UpdateServiceOrderStatusCommandHandler(
        IServiceOrderRepository repository,
        ITenantContext tenantContext)
    {
        _repository = repository;
        _tenantContext = tenantContext;
    }

    public async Task<ServiceOrderStatusUpdateResult> Handle(
        UpdateServiceOrderStatusCommand command, CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;

        var order = await _repository.GetByIdAsync(tenantId, command.Id, ct);
        if (order is null)
            return new ServiceOrderStatusUpdateResult(Found: false);

        if (!ServiceOrderStatusTransition.IsValidStatus(command.Status))
            return new ServiceOrderStatusUpdateResult(Found: true, InvalidStatus: true);

        if (!ServiceOrderStatusTransition.IsValidTransition(order.Status, command.Status))
            return new ServiceOrderStatusUpdateResult(Found: true, InvalidTransition: true);

        if (command.Status == "delivered")
        {
            var notificationData = await _repository.GetDeliveryNotificationDataAsync(
                tenantId, command.Id, ct);

            if (notificationData is null)
                return new ServiceOrderStatusUpdateResult(Found: false);

            if (string.IsNullOrWhiteSpace(notificationData.CustomerPhoneE164))
                return await _repository.UpdateStatusAsync(
                    tenantId, command.Id, command.CurrentVersion, command.Status, ct);

            var payloadObj = new
            {
                serviceOrderId = command.Id.ToString(),
                customerName = notificationData.CustomerName,
                vehicleLabel = BuildVehicleLabel(
                    notificationData.Plate,
                    notificationData.VehicleMake,
                    notificationData.VehicleModel),
                deliveredAt = DateTime.UtcNow.ToString("o")
            };

            var outboxMessage = new OutboxMessageRow(
                TenantId: tenantId,
                Channel: "whatsapp",
                RecipientPhoneE164: notificationData.CustomerPhoneE164,
                TemplateKey: "service_delivered",
                Payload: JsonSerializer.Serialize(payloadObj),
                IdempotencyKey: $"service-order:{command.Id}:delivered");

            return await _repository.UpdateStatusAndEnqueueAsync(
                tenantId, command.Id, command.CurrentVersion,
                command.Status, outboxMessage, ct);
        }

        return await _repository.UpdateStatusAsync(
            tenantId, command.Id, command.CurrentVersion, command.Status, ct);
    }

    private static string BuildVehicleLabel(string? plate, string? make, string? model)
    {
        var parts = new[] { make, model, plate };
        var nonNull = parts.Where(p => !string.IsNullOrWhiteSpace(p)).ToArray();
        return nonNull.Length > 0 ? string.Join(" ", nonNull) : "Vehicle";
    }
}
