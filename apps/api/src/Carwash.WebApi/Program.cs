using Carwash.Application.Abstractions;
using Carwash.Infrastructure.Security;
using Carwash.WebApi.Middleware;
using Carwash.WebApi.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog((sp, cfg) => cfg.ReadFrom.Configuration(builder.Configuration));

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var supabaseSection = builder.Configuration.GetSection("Supabase");
        options.Authority = $"{supabaseSection["Url"]}/auth/v1";
        options.Audience = supabaseSection["JwtAudience"] ?? "authenticated";
        options.TokenValidationParameters.ValidateIssuer = true;
        options.TokenValidationParameters.ValidateAudience = true;
        options.TokenValidationParameters.ValidateLifetime = true;
        options.RequireHttpsMetadata = false;
    });

builder.Services.AddScoped<IUserContext, HttpUserContext>();
builder.Services.AddScoped<ITenantMembershipValidator>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var connString = config["Database:ConnectionString"] ?? "";
    return new TenantMembershipValidator(connString);
});
builder.Services.AddScoped<ITenantContext>(sp =>
{
    var accessor = sp.GetRequiredService<IHttpContextAccessor>();
    var obj = accessor.HttpContext?.Items["TenantContext"];
    return obj as ITenantContext ?? new CurrentTenantContext { TenantId = Guid.Empty, Role = string.Empty };
});

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseAuthorization();

app.MapControllers();

app.Run();