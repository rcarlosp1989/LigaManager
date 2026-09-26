# ============================================================
# LigaManager API - Dockerfile para Railway
# Ubicacion: C:\proyectos\LigaManager\backend\Dockerfile
# Railway -> Settings -> Root Directory = /backend
# ============================================================

# ---------- Etapa 1: build ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copia todos los proyectos de Clean Architecture (API, Application, Domain, Infrastructure)
COPY src/ ./src/

# Restaura y publica solo el proyecto API (arrastra sus referencias)
RUN dotnet restore src/LigaManager.API/LigaManager.API.csproj
RUN dotnet publish src/LigaManager.API/LigaManager.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ---------- Etapa 2: runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true

# Railway asigna el puerto en la variable PORT; localmente usa 8080
EXPOSE 8080
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} dotnet LigaManager.API.dll"]
