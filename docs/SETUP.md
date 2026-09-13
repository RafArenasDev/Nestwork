# Entorno de desarrollo

## Estado actual (real, verificado)

| Servicio            | Cómo corre hoy                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| PHP / Laravel       | **Herd** (`http://chat-app.test`) — no hay servidor Vite/PHP manual que levantar                  |
| PostgreSQL          | **Nativo**, instalado localmente (Postgres 18, `C:\Program Files\PostgreSQL\18`), base `chat_app` |
| Redis               | 🔲 No instalado todavía (Reverb corre sin Redis — cola/queue usa el driver `database`)            |
| Reverb (WebSockets) | 🟢 Instalado y en uso — ver "Tiempo real (Laravel Reverb)" más abajo para el setup en máquina nueva |
| Mail                | Driver `log` (no hay Mailpit/Mailhog corriendo, los emails van al log de Laravel)                 |
| Storage de archivos | Driver `local`, sin MinIO todavía                                                                 |

## Por qué nativo y no Docker Compose (por ahora)

El usuario ya tenía PostgreSQL nativo instalado en su máquina (igual que en sus otros proyectos Laravel con Herd). Mientras el proyecto no necesite Redis + Reverb + MinIO simultáneamente, forzar Docker Compose agrega una capa de complejidad sin beneficio real. **Esto se reevalúa cuando arranque Fase 1** (Reverb + Redis se vuelven necesarios para mensajería en tiempo real) — en ese punto, Docker Compose para _esos_ servicios específicos (no para Postgres, que se queda nativo) es la recomendación por defecto, para no tener que instalar Redis/Reverb como servicios de Windows a mano.

## Variables de entorno

`.env` (no versionado) contiene las credenciales reales; `.env.example` documenta la forma esperada sin valores sensibles. Confirmado: `.env`, `.env.backup`, `.env.production` están en `.gitignore`.

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=chat_app
DB_USERNAME=postgres
DB_PASSWORD=          # ver .env local, no compartido acá
```

## Cómo levantar el proyecto

```bash
cd C:\Users\usuario\Herd\chat-app
# El sitio ya está servido por Herd en http://chat-app.test — no hace falta "npm run dev"
# salvo que se quiera hot-reload de assets:
npm run dev

# Tests:
php artisan test

# Lint/format frontend:
npm run check:fix

# Estilo de código PHP:
php vendor/bin/pint
```

## Tiempo real (Laravel Reverb)

Reverb ya está instalado y funcionando en la máquina de desarrollo original. Para instalar el proyecto en una máquina Windows **nueva** (con Herd ya instalado y el sitio linkeado — `herd link` — y sirviendo por HTTPS), Reverb necesita dos cosas que Herd no arma solo: un puerto propio (para no chocar con otro proyecto que también use Reverb en la misma máquina) y un proxy en la config de nginx de Herd para que el navegador pueda hablarle por WebSocket a través del mismo dominio HTTPS del sitio.

### Automático (recomendado)

```powershell
# Primero, si REVERB_APP_ID/KEY/SECRET no existen todavía en .env:
php artisan reverb:install

# Después, configura puerto + proxy de nginx solo:
.\scripts\setup-reverb-windows.ps1
```

O doble clic en `setup-reverb.bat` en la raíz del proyecto (hace lo mismo, pensado para quien no quiere abrir una terminal). El script:

1. Lee el dominio del sitio desde `APP_URL` en `.env`.
2. Busca el primer puerto libre desde el 8081 en adelante (no usa el 8080 a propósito — en esta familia de proyectos, Inventory-Manager ya lo tiene tomado con una tarea programada de Windows que lo reinicia sola) y lo escribe en `.env` (`REVERB_SERVER_PORT`/`REVERB_PORT`, más `VITE_REVERB_HOST`/`PORT`/`SCHEME` apuntando al dominio HTTPS real).
3. Agrega el bloque `location /app { proxy_pass http://127.0.0.1:<puerto>; ... }` a la config de nginx de Herd para el sitio (`~/.config/herd/config/valet/Nginx/<sitio>.conf`), dentro de su server block HTTPS.
4. Reinicia nginx (`herd restart nginx`) para que el cambio tome efecto.
5. Es **idempotente** — volver a correrlo no duplica el bloque de nginx ni pisa otras variables de `.env`. Hace falta correrlo de nuevo cada vez que Herd regenera esa config (reinicio del servicio, cambio de versión de PHP) y se lleva puesto el bloque `/app`.

Después de correrlo: `composer run dev` (levanta `php artisan serve` + `queue:listen` + `vite` + `reverb:start` juntos, ver `composer.json`).

### Manual (si el script no aplica, ej. en Mac/Linux)

1. `php artisan reverb:install` (genera `REVERB_APP_ID`/`KEY`/`SECRET` y publica `config/reverb.php`).
2. En `.env`: `REVERB_SERVER_HOST=127.0.0.1`, `REVERB_SERVER_PORT=<puerto libre>`, `REVERB_HOST=127.0.0.1`, `REVERB_PORT=<mismo puerto>`, `REVERB_SCHEME=http` (interno, PHP -> Reverb, sin TLS) y `VITE_REVERB_HOST=<dominio del sitio>`, `VITE_REVERB_PORT=443`, `VITE_REVERB_SCHEME=https` (navegador -> Reverb, vía el proxy HTTPS del sitio).
3. Agregar el proxy WebSocket al servidor web (nginx/Herd, Caddy, etc.) — mismo bloque que arma el script arriba, apuntando al puerto elegido.
4. `composer run dev`.
