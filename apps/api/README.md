# CARWASH API

.NET 9 Web API using Clean Architecture with CQRS (MediatR).

## Project Structure

```
src/
  Carwash.Domain/          Domain entities, value objects, domain services
  Carwash.Application/     Use cases, commands, queries, DTOs, interfaces
  Carwash.Infrastructure/  Repositories, external services, Supabase, image processing
  Carwash.WebApi/          Controllers, middleware, DI setup
tests/
  Carwash.UnitTests/       Unit tests for domain and application
  Carwash.IntegrationTests/ Integration tests
```

## Prerequisites

- .NET 9 SDK

## Build

```bash
dotnet restore
dotnet build
```

## Run

```bash
dotnet run --project src/Carwash.WebApi
```

The API starts on `http://localhost:5000` by default.

## Test

```bash
dotnet test
```

## Health Check

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{ "api": "ok", "version": "0.1.0" }
```