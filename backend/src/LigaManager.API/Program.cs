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
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<VocalService>();
builder.Services.AddScoped<IAlmacenImagenes, AlmacenImagenesBd>();

// ── Límite de intentos fallidos (código de invitación, inicio de sesión) ──────
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<LigaManager.API.Seguridad.LimiteIntentos>();

// Railway pasa la petición por su proxy: la IP real del visitante llega en X-Forwarded-For.
// Se toma solo el último valor (el que agrega el proxy), así no se puede falsificar.
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(opt =>
{
    opt.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor;
    opt.ForwardLimit = 1;
    opt.KnownNetworks.Clear();
    opt.KnownProxies.Clear();
});

builder.Services.Configure<LigaManager.Application.Common.ReglasDisciplinariasOptions>(
    builder.Configuration.GetSection("ReglasDisciplinarias"));

// ── JWT ───────────────────────────────────────────────────────────────────────
// La clave que firma las sesiones nunca va en el código (el repositorio es público).
// En Railway está en la variable JwtSettings__SecretKey. Publicado (Railway o contenedor), sin
// esa variable o con la clave que antes estaba en appsettings.json, el servidor no arranca.
// En la computadora (dotnet run) usa una clave de prueba para no estorbar el desarrollo.
var secretKey = builder.Configuration["JwtSettings:SecretKey"];
const string ClaveVieja = "LigaManager$2024#SecretKey!XyZ9@Kp12345678";
var publicado = Environment.GetEnvironmentVariable("RAILWAY_ENVIRONMENT") is not null
             || Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";
if (string.IsNullOrWhiteSpace(secretKey) || secretKey == ClaveVieja || Encoding.UTF8.GetByteCount(secretKey) < 32)
{
    if (publicado)
        throw new InvalidOperationException(
            "Falta la variable JwtSettings__SecretKey (mínimo 32 caracteres, distinta a la del código).");
    Console.WriteLine("Aviso: sin JwtSettings__SecretKey; se usa una clave de prueba solo para esta computadora.");
    secretKey = "solo-desarrollo-local-no-usar-en-produccion-0123456789";
}
// AuthService firma los tokens leyendo la configuración: se deja ahí la clave ya resuelta.
builder.Configuration["JwtSettings:SecretKey"] = secretKey;
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
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode  = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    "{\"error\":\"No tienes permiso para esta acción.\"}");
            },
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

// ── Permisos por rol ─────────────────────────────────────────────────────────
// Por defecto ([Authorize]) se rechaza el rol Vocal: el vocal solo usa /api/vocal,
// que pide la política SoloVocal. Así todo lo que el vocal no puede hacer (editar o borrar
// partidos, tocar jugadores, ver otros campeonatos) lo bloquea el servidor.
builder.Services.AddAuthorization(opt =>
{
    opt.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .RequireAssertion(ctx => !ctx.User.IsInRole("Vocal"))
        .Build();
    opt.AddPolicy(LigaManager.API.Controllers.Politicas.SoloVocal, p => p.RequireRole("Vocal"));
});

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
app.UseForwardedHeaders();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LigaManager API v1");
        c.DisplayRequestDuration();
    });
}

// Encabezados de seguridad: el navegador no adivina tipos de archivo (una «foto» no se
// ejecuta como página), la API no se puede incrustar en otro sitio y no se filtra la URL.
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"]        = "DENY";
    ctx.Response.Headers["Referrer-Policy"]        = "no-referrer";
    await next();
});

app.UseCors("FrontendPolicy");

// Errores: los de la petición (400) muestran su mensaje; los internos (500) se anotan en el
// registro del servidor y al usuario solo le llega un mensaje genérico, sin detalles técnicos.
app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (Exception ex) when (!ctx.Response.HasStarted)
    {
        var peticion = ex as BadHttpRequestException;
        // Un registro repetido (clave única de la base): no es un error interno, es un dato que ya existe.
        if (peticion is null && ex is Microsoft.EntityFrameworkCore.DbUpdateException
            && ex.InnerException?.Message.Contains("Duplicate entry", StringComparison.OrdinalIgnoreCase) == true)
        {
            ctx.Response.StatusCode  = 409;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
            {
                error = "Ya existe un registro con esos mismos datos. Revisa la lista: puede que ya esté guardado."
            }));
            return;
        }
        if (peticion is null)
            ctx.RequestServices.GetRequiredService<ILogger<Program>>()
                .LogError(ex, "Error no controlado en {Metodo} {Ruta}", ctx.Request.Method, ctx.Request.Path);
        ctx.Response.StatusCode  = peticion?.StatusCode ?? 500;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
        {
            error = peticion?.Message ?? "Ocurrió un error inesperado. Inténtalo de nuevo; si sigue pasando, avisa al administrador."
        }));
    }
});

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
