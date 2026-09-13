<#
.SYNOPSIS
    Configura Laravel Reverb (WebSockets) para Nestwork en una máquina
    Windows con Herd, sin pasos manuales.

.DESCRIPTION
    Este proyecto usa Laravel Reverb para tiempo real (mensajes, "está
    escribiendo...", recibos de lectura). Reverb necesita DOS cosas que
    Herd no configura solo:

    1. Un puerto propio para el proceso `reverb:start` que no choque con
       el de OTRO proyecto en la misma máquina. En esta máquina en
       particular, Inventory-Manager ya usa el 8080 con una tarea
       programada de Windows que lo reinicia solo — Nestwork terminó
       usando el 8081 por eso (ver docs/DECISIONS.md). Este script
       prueba puertos desde 8081 y usa el primero libre, así una
       instalación nueva no se pisa con lo que sea que ya esté corriendo.
    2. Un proxy en la config de nginx de Herd para el sitio
       (`/app` -> `http://127.0.0.1:<puerto>`), porque el navegador le
       habla a Reverb a través del mismo dominio/HTTPS del sitio
       (`VITE_REVERB_HOST`), no directo al puerto interno.

    Herd REGENERA esa config de nginx cada tanto (al reiniciar el
    servicio, al cambiar de versión de PHP, etc.) y se lleva puesto el
    bloque `/app` si se editó a mano — por eso este script es idempotente
    y pensado para volver a correrse cuando eso pase, no sólo la primera
    vez.

.EXAMPLE
    .\scripts\setup-reverb-windows.ps1

.EXAMPLE
    # Forzar un puerto específico en vez de auto-detectar uno libre
    .\scripts\setup-reverb-windows.ps1 -Port 8082
#>

param(
    [int]$Port = 0,
    [int]$PortRangeStart = 8081,
    [int]$PortRangeEnd = 8099
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot '.env'

Write-Host "== Setup de Reverb para Nestwork ==" -ForegroundColor Cyan

if (-not (Test-Path $envPath)) {
    Write-Error ".env no encontrado en $envPath — copia .env.example a .env y corre 'php artisan key:generate' antes de este script."
    exit 1
}

$envContent = Get-Content $envPath -Raw

# --- 1. Detectar el nombre del sitio desde APP_URL (ej. https://chat-app.test -> chat-app.test) ---
$siteHost = $null
if ($envContent -match 'APP_URL\s*=\s*"?https?:\/\/([^"\r\n]+)"?') {
    $siteHost = $Matches[1].TrimEnd('/')
}

if (-not $siteHost) {
    Write-Error "No pude leer APP_URL de .env — revisa que exista una línea como APP_URL=http://chat-app.test"
    exit 1
}

Write-Host "Sitio detectado: $siteHost"

# --- 2. Elegir puerto: el que pida -Port, o el primero libre en el rango ---
function Test-PortFree([int]$TestPort) {
    $inUse = Get-NetTCPConnection -LocalPort $TestPort -ErrorAction SilentlyContinue
    return -not $inUse
}

if ($Port -eq 0) {
    Write-Host "Buscando un puerto libre entre $PortRangeStart y $PortRangeEnd..."
    for ($candidate = $PortRangeStart; $candidate -le $PortRangeEnd; $candidate++) {
        if (Test-PortFree $candidate) {
            $Port = $candidate
            break
        }
    }

    if ($Port -eq 0) {
        Write-Error "No encontré ningún puerto libre entre $PortRangeStart y $PortRangeEnd — pasa uno a mano con -Port."
        exit 1
    }
} elseif (-not (Test-PortFree $Port)) {
    Write-Warning "El puerto $Port ya está en uso por otro proceso — seguimos igual (puede ser el propio Reverb de una corrida anterior), pero si `composer run dev` falla al arrancar reverb:start, corré este script de nuevo con otro -Port."
}

Write-Host "Puerto elegido para Reverb: $Port" -ForegroundColor Green

# --- 3. Actualizar .env (in-place, conserva todo lo demás) ---
function Set-EnvValue([string]$Content, [string]$Key, [string]$Value) {
    $pattern = "(?m)^$Key=.*$"
    $line = "$Key=$Value"

    if ($Content -match $pattern) {
        return [regex]::Replace($Content, $pattern, { param($m) $line })
    }

    return $Content.TrimEnd() + "`n$line`n"
}

$envContent = Set-EnvValue $envContent 'REVERB_SERVER_HOST' '127.0.0.1'
$envContent = Set-EnvValue $envContent 'REVERB_SERVER_PORT' "$Port"
$envContent = Set-EnvValue $envContent 'REVERB_HOST' '127.0.0.1'
$envContent = Set-EnvValue $envContent 'REVERB_PORT' "$Port"
$envContent = Set-EnvValue $envContent 'REVERB_SCHEME' 'http'
$envContent = Set-EnvValue $envContent 'VITE_REVERB_HOST' $siteHost
$envContent = Set-EnvValue $envContent 'VITE_REVERB_PORT' '443'
$envContent = Set-EnvValue $envContent 'VITE_REVERB_SCHEME' 'https'

if ($envContent -notmatch '(?m)^REVERB_APP_ID=') {
    Write-Warning "No hay REVERB_APP_ID/KEY/SECRET en .env todavía — corré 'php artisan reverb:install' primero (genera esas 3 claves), después volvé a correr este script."
}

Set-Content -Path $envPath -Value $envContent -NoNewline
Write-Host ".env actualizado." -ForegroundColor Green

# --- 4. Insertar el bloque /app en la config de nginx de Herd para el sitio ---
$nginxConfPath = Join-Path $env:USERPROFILE ".config\herd\config\valet\Nginx\$siteHost.conf"

if (-not (Test-Path $nginxConfPath)) {
    Write-Warning "No encontré la config de nginx de Herd para '$siteHost' en $nginxConfPath — ¿el sitio ya está linkeado en Herd (herd link) y servido por HTTPS? Sin ese archivo no puedo agregar el proxy /app; hacé el link primero y volvé a correr este script."
} else {
    $nginxConf = Get-Content $nginxConfPath -Raw

    if ($nginxConf -match '(?m)^\s*location\s+/app\s*\{') {
        Write-Host "El bloque 'location /app' ya existe en la config de nginx — no se duplica." -ForegroundColor Yellow
    } else {
        $proxyBlock = @"

    # --- Nestwork / Laravel Reverb --------------------------------------
    # Agregado por scripts/setup-reverb-windows.ps1 — Herd REGENERA este
    # archivo de vez en cuando (reinicio del servicio, cambio de versión
    # de PHP) y se lleva puesto este bloque. Si el WebSocket deja de
    # conectar después de eso, volvé a correr el script.
    location /app {
        proxy_pass http://127.0.0.1:$Port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host `$host;
        proxy_read_timeout 60s;
    }
    # ---------------------------------------------------------------------
"@

        # Insertar DENTRO del server block SSL (listen ... 443 ssl), justo
        # antes de su "location / {" — mismo lugar que la config manual
        # original (ver docs/DECISIONS.md). Buscamos el primer
        # "location / {" que aparezca DESPUÉS de un "listen ... 443 ssl".
        $sslBlockMatch = [regex]::Match($nginxConf, 'listen\s+127\.0\.0\.1:443\s+ssl.*?location\s+/\s*\{', [System.Text.RegularExpressions.RegexOptions]::Singleline)

        if (-not $sslBlockMatch.Success) {
            Write-Warning "No encontré 'location / {' dentro de un server block HTTPS (443 ssl) en la config de nginx — la estructura del archivo cambió respecto a lo esperado. Agregá el bloque /app a mano (ver docs/SETUP.md) usando este contenido:`n$proxyBlock"
        } else {
            $insertAt = $sslBlockMatch.Index + $sslBlockMatch.Length - 'location / {'.Length
            $newConf = $nginxConf.Insert($insertAt, $proxyBlock + "`n    ")
            Set-Content -Path $nginxConfPath -Value $newConf -NoNewline
            Write-Host "Bloque 'location /app' agregado a la config de nginx." -ForegroundColor Green
        }
    }
}

# --- 5. Reiniciar nginx para que Herd recargue la config ---
$herdCmd = Get-Command herd -ErrorAction SilentlyContinue
if ($herdCmd) {
    Write-Host "Reiniciando nginx (herd restart nginx)..."
    & herd restart nginx | Out-Null
    Write-Host "nginx reiniciado." -ForegroundColor Green
} else {
    Write-Warning "No encontré el comando 'herd' en el PATH — reiniciá nginx a mano desde la app de Herd (o corré 'herd restart nginx' en una terminal donde sí esté disponible)."
}

Write-Host ""
Write-Host "== Listo ==" -ForegroundColor Cyan
Write-Host "Si REVERB_APP_ID/KEY/SECRET faltaban, corré 'php artisan reverb:install' y volvé a correr este script una vez más."
Write-Host "Después: 'composer run dev' (arranca server + queue + vite + reverb:start juntos)."
