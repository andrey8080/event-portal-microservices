# back

Этот каталог содержит набор Spring Boot микросервисов и инфраструктуру для локального запуска через Docker Compose.

## Быстрый старт

1) Создай `.env` на базе примера:

- `cp .env.example .env`

2) Конфиги сервисов:

- В каждом сервисе есть `src/main/resources/application.properties.example`.
- Для запуска без Docker можно сделать копию рядом:
	- `cp <service>/src/main/resources/application.properties.example <service>/src/main/resources/application.properties`

1) Подними Postgres и сервисы:

- `docker compose up --build`

Основной вход (один URL) через gateway:
- `http://localhost:8080`

Роутинг по префиксу:
- `/auth/*` : auth-service
- `/users/*` : user-service
- `/events/*` : event-service
- `/quizzes/*` : quiz-service
- `/api/geo/*` и `/geo/*` : geo-service

Сервисы также доступны на хосте напрямую (для дебага):
- auth-service: `http://localhost:8081`
- user-service: `http://localhost:8082`
- event-service: `http://localhost:8083`
- quiz-service: `http://localhost:8084`
- geo-service: `http://localhost:8085`

## Замечания

- `docker-compose.yml` использует multi-stage сборку: Gradle (`./gradlew :<service>:bootJar`) запускается внутри `docker build`, поэтому предварительно собирать JAR на хосте не нужно.
