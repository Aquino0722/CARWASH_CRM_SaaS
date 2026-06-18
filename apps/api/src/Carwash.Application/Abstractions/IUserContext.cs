namespace Carwash.Application.Abstractions;

public interface IUserContext
{
    Guid UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
}