using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;
using LigaManager.Infrastructure.Data;
using LigaManager.Application.Interfaces;
using LigaManager.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpContextAccessor();

// ── Base de datos ─────────────────────────────────────────────────────────────
var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<LigaManagerContext>(options =>
    options.UseMySql(connStr, ServerVersion.AutoDetect(connStr))
           .LogTo(Console.WriteLine, LogLevel.Warning)
);

// ── Inyección de dependencias ─────────────────────────────────────────────────
builder.Services.AddScoped<AccesoCampeonato>();
builder.Services.AddScoped<Ubicaciones>();
builder.Services.AddScoped<IAuthService,       AuthService>();
builder.Services.AddScoped<ICampeonatoService, CampeonatoService>();
builder.Services.AddScoped<IEquipoService,     EquipoService>();
builder.Services.AddScoped<IJugadorService,    JugadorService>();
builder.Services.AddScoped<IJornadaService,    JornadaService>();
builder.Services.AddScoped<IArbitroService,    ArbitroService>();
builder.Services.AddScoped<IEstadioService,    EstadioService>();
builder.Services.AddScoped<IGrupoService,      GrupoService>();
builder.Services.AddScoped<IEstadisticasService, EstadisticasService>();
builder.Services.AddScoped<DashboardService>();

builder.Services.Configure<LigaManager.Application.Common.ReglasDisciplinariasOptions>(
    builder.Configuration.GetSection("ReglasDisciplinarias"));

// ── JWT ───────────────────────────────────────────────────────────────────────
var secretKey = builder.Configuration["JwtSettings:SecretKey"] 
    ?? "LigaManager$2024#SecretKey!XyZ9@Kp12345678";
var issuer    = builder.Configuration["JwtSettings:Issuer"]    ?? "LigaManagerAPI";
var audience  = builder.Configuration["JwtSettings:Audience"]  ?? "LigaManagerClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = issuer,
            ValidAudience            = audience,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
        opt.Events = new JwtBearerEvents
        {
            OnChallenge = ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode  = 401;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    "{\"error\":\"No autorizado. Token inválido o expirado.\"}");
            }
        };
    });

builder.Services.AddAuthorization();

// ── Controllers con enums como strings ───────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        opt.JsonSerializerOptions.DefaultIgnoreCondition =
            JsonIgnoreCondition.WhenWritingNull;
    });

// ── Swagger con soporte JWT ───────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "LigaManager API",
        Version     = "v1",
        Description = "API para gestión de campeonatos de fútbol"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization. Ingrese: Bearer {token}",
        Name        = "Authorization",
        In          = ParameterLocation.Header,
        Type        = SecuritySchemeType.ApiKey,
        Scheme      = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── CORS ──────────────────────────────────────────────────────────────────────
// Origenes permitidos: localhost + los de la variable Cors__AllowedOrigins
var corsOrigins = new List<string> { "http://localhost:5173" };
var extraOrigins = builder.Configuration["Cors:AllowedOrigins"];
if (!string.IsNullOrWhiteSpace(extraOrigins))
{
    corsOrigins.AddRange(extraOrigins.Split(',',
        StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LigaManager API v1");
        c.DisplayRequestDuration();
    });
}

app.UseCors("FrontendPolicy");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (Exception ex)
    {
        ctx.Response.StatusCode  = 500;
        ctx.Response.ContentType = "application/json";
        var msg = ex.Message;
        await ctx.Response.WriteAsync($"{{\"error\":\"{msg}\"}}");
    }
});

app.MapControllers();
app.Run();
