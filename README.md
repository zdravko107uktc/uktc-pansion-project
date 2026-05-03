# UKTC-TESSIS

Deployment target:
- frontend on Vercel
- backend on Railway
- MySQL on Railway

## Architecture

- The React app is built from [frontend](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/frontend).
- The PHP API is served from [backend](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/backend).
- The backend now supports:
  - Railway MySQL variables like `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`
  - optional `DATABASE_URL`
  - configurable CORS via `CORS_ALLOWED_ORIGINS`
  - healthcheck at `/health`
  - configurable system admin email via `SYSTEM_ADMIN_EMAIL`

## Vercel

Create a Vercel project with root directory `frontend`.

Set environment variables:
- `REACT_APP_API_URL=https://your-backend.up.railway.app`

Config included:
- [frontend/vercel.json](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/frontend/vercel.json) for SPA routing

Example env file:
- [frontend/.env.vercel.example](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/frontend/.env.vercel.example)

## Railway

Create one Railway service for the backend from this repo root.

Config included:
- [railway.json](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/railway.json)

Provision a MySQL database in Railway and either:
- let Railway inject `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`
- or define `DATABASE_URL`

Recommended Railway backend variables:
- `JWT_SECRET`
- `SYSTEM_ADMIN_EMAIL`
- `CORS_ALLOWED_ORIGINS`
- `MAIL_FROM`
- `MAIL_FROM_NAME`
- `MAIL_SMTP_HOST`
- `MAIL_SMTP_PORT`
- `MAIL_SMTP_ENCRYPTION`
- `MAIL_SMTP_USERNAME`
- `MAIL_SMTP_PASSWORD`
- `MAIL_SMTP_TIMEOUT`
- `MAIL_EHLO_DOMAIN`
- `FRONTEND_BASE_URL`
- `PASSWORD_RESET_TOKEN_MINUTES`
- `MAIL_FORCE_LOG_ONLY`

Example env file:
- [backend/.env.railway.example](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/backend/.env.railway.example)

## Important Notes

- Local Mailpit is only for development. Real emails require a real SMTP provider.
- Existing data schema is auto-created by [backend/src/config/database.php](/C:/Users/zdrav/Downloads/UKTC-TESSIS-main/backend/src/config/database.php), so Railway MySQL does not need the Docker init script.
- The API health endpoint is `GET /health`.
- For production, set `CORS_ALLOWED_ORIGINS` to your real Vercel URL, for example `https://your-project.vercel.app`.
