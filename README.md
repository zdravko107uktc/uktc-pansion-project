# UKTC Pansion

**Made by:** Zdravko Anev — 22314 · Dimitur Georgiev — 22314

Dormitory (pansion) enrollment management system for a school: students check in/out, staff
(counselors and admins) review unenrollment requests with digital signatures, everyone shares a
calendar, and every action is mirrored to email and an audit log.

- **Frontend:** React (Vercel)
- **Backend:** Java 21 + Spring Boot 3.3 (Railway)
- **Database:** MySQL 8

> The backend was migrated from a PHP monolith to a layered Spring Boot application. The HTTP API is
> now a clean REST API under `/api/v1`.

## Architecture

The backend (`backend/`) is organised in clean layers with one responsibility each:

```
web (controllers, DTOs, mappers)      HTTP only – no business logic
   -> service (interfaces + impl)     use-cases, transactions, validation
        -> repository (Spring Data)   persistence
             -> domain (entities)     JPA model + enums
notification (events + dispatcher + mail transport)   cross-cutting, async
security (JWT filter, provider, config)               authentication/authorization
config (typed @ConfigurationProperties)               configuration
```

### SOLID & design patterns

- **Single Responsibility** – controllers map HTTP, services own use-cases, `ApiMapper` does
  DTO translation, `RolePolicy`/`PasswordPolicy`/`InputValidator` each own one rule set.
- **Open/Closed + Dependency Inversion** – services depend on interfaces (`UserService`,
  `EnrollmentService`, `CalendarService`, `NotificationService`, `MailTransport`); concrete impls
  are injected.
- **Strategy** – `MailTransport` abstracts delivery (`SmtpMailTransport` today; add providers
  without touching callers). Falls back to log-only when no SMTP host is configured.
- **Observer / event-driven** – business services publish domain events
  (`UserRegisteredEvent`, `UnenrollmentReviewedEvent`, `CalendarEventChangedEvent`, …). The
  `NotificationDispatcher` listens **after commit** on a dedicated executor and composes the emails,
  so notifications never block or roll back the originating request.
- **Repository** – Spring Data JPA. **Factory** – `TokenFactory` for opaque tokens.
- **Value objects / records** – DTOs and commands are immutable records.

### New functionality (account security)

- **Login lockout** – temporary 429 after repeated failed logins (`login_attempts`).
- **Password no-reuse** – previous password hashes are remembered (`password_history`).
- **Email verification** – optional (`SECURITY_REQUIRE_EMAIL_VERIFICATION=true`); issues a
  single-use verification link and blocks login until verified.

## REST API (`/api/v1`)

| Method & path | Description | Access |
|---|---|---|
| `POST /auth/login` | Log in, returns JWT | public |
| `POST /auth/register` | Self-registration | public |
| `POST /auth/password-reset/request` | Request reset link | public |
| `POST /auth/password-reset/confirm` | Set new password | public |
| `POST /auth/verify-email` | Confirm email | public |
| `GET /users/me` | Current user | any |
| `GET/POST /users`, `PUT/DELETE /users/{id}` | Manage users | admin |
| `POST /enrollment/status` | Check in / request check-out | student |
| `GET /enrollment/history` | My recent activity | any |
| `GET /enrollment/records/week` | Weekly board | staff |
| `GET /enrollment/requests/pending` | Pending requests | staff |
| `POST /enrollment/requests/{id}/approve` `/reject` | Review request | staff |
| `GET /calendar?month=YYYY-MM` | Calendar + summary/attendance | any |
| `POST/PUT/DELETE /calendar/events[/{id}]` | Manage events | admin |
| `GET/DELETE /notifications[/{id}]` | Email audit log | admin |
| `GET /health` | Health check | public |

## Run locally (Docker Compose)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Mailpit (captured emails): http://localhost:8025
- Schema is created/migrated automatically by **Flyway** (`backend/src/main/resources/db/migration`).

The first account registered with the `SYSTEM_ADMIN_EMAIL` becomes the admin.

## Docker Hub images

The two images we build (`backend` and `frontend`) are published publicly on Docker Hub:

- **Backend:** https://hub.docker.com/r/zdravko107/uktc-pansion-backend
- **Frontend:** https://hub.docker.com/r/zdravko107/uktc-pansion-frontend

### Build and push the images

```bash
docker login

# Build both images using the tags declared in compose.yml
docker compose build

# Push both to Docker Hub
docker compose push
```

Or build/push each image manually:

```bash
docker build -t zdravko107/uktc-pansion-backend:latest ./backend
docker build -t zdravko107/uktc-pansion-frontend:latest ./frontend

docker push zdravko107/uktc-pansion-backend:latest
docker push zdravko107/uktc-pansion-frontend:latest
```

### Run straight from the published images

Because `compose.yml` declares an `image:` for each service, anyone can pull and run
without building locally:

```bash
docker compose pull
docker compose up
```

## Run the backend directly

```bash
cd backend
./mvnw spring-boot:run    # or: mvn spring-boot:run
```

Configuration is environment-driven; see [`backend/.env.example`](backend/.env.example).

## Deployment

- **Backend (Railway):** build from `backend/` (Dockerfile builds the Spring Boot jar). Provide
  the MySQL variables (`MYSQLHOST/MYSQLPORT/MYSQLDATABASE/MYSQLUSER/MYSQLPASSWORD` or
  `SPRING_DATASOURCE_URL`) plus `JWT_SECRET`, `SYSTEM_ADMIN_EMAIL`, `CORS_ALLOWED_ORIGINS`,
  `FRONTEND_BASE_URL`, and the `MAIL_*` SMTP settings. The app listens on `$PORT` (default 8080).
- **Frontend (Vercel):** root `frontend`, set `REACT_APP_API_URL` to the backend origin.
- Health check path: `GET /health`.

## Notes

- Local Mailpit is for development only; real email requires a real SMTP provider.
- For production set `CORS_ALLOWED_ORIGINS` to your real frontend URL.
