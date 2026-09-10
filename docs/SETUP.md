# Entorno de desarrollo

## Estado actual (real, verificado)

| Servicio            | Cómo corre hoy                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| PHP / Laravel       | **Herd** (`http://chat-app.test`) — no hay servidor Vite/PHP manual que levantar                  |
| PostgreSQL          | **Nativo**, instalado localmente (Postgres 18, `C:\Program Files\PostgreSQL\18`), base `chat_app` |
| Redis               | 🔲 No instalado todavía                                                                           |
| Reverb (WebSockets) | 🔲 No instalado todavía                                                                           |
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

## Pendiente para cuando arranque Fase 1 (Mensajería en tiempo real)

1. Instalar Redis (Windows: vía WSL, Memurai, o contenedor Docker — a decidir en ese momento).
2. `composer require laravel/reverb` + `php artisan reverb:install`.
3. Configurar `BROADCAST_CONNECTION=reverb` en `.env` (hoy está en `log`).
4. Correr `php artisan reverb:start` como proceso aparte durante desarrollo.
