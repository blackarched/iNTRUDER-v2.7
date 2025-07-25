# NEXUS SECURITY GRID - v2.5 (Production Ready)

An advanced, containerized surveillance system with real-time threat assessment, secure API, and live monitoring dashboard.

## Features

-   **Containerized Stack:** All services (backend, DB, stream manager) run in Docker.
-   **Secure API:** Endpoints protected by JWT authentication, validation, rate limiting, and Helmet security headers.
-   **Live WebSocket Feed:** Real-time data pushed to the frontend HUD for live monitoring.
-   **Stream Management:** Dedicated service for handling RTSP/HTTP video streams using FFmpeg.
-   **Monitoring & Health:** Prometheus metrics endpoint and Docker health checks for production stability.
-   **Automated CI/CD:** GitHub Actions pipeline for linting and testing on every commit.

## Prerequisites

-   Docker & Docker Compose
-   Node.js v18+
-   `openssl`

## Setup & Deployment

1.  **Clone Repository:**
    `git clone <url> && cd nexus-security-grid`

2.  **Configure Environment:**
    Copy the environment template and populate `.env` with your secrets.
    `cp .env.example .env`

3.  **Generate SSL Certificates:**
    `mkdir -p certs && openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"`

4.  **Install Host Dependencies:**
    `npm install`

5.  **Build and Launch the Grid:**
    `docker-compose up --build -d`

## Validation and Testing

-   **Linting & Formatting:** `npm run lint` and `npm run format`
-   **Automated Tests:** `npm test`

## Accessing the System

-   **Dashboard:** `https://localhost` (NGINX proxying to the server)
-   **API Docs (Swagger):** `https://localhost/api-docs`
-   **API Health:** `https://localhost/api/health`
-   **Prometheus Metrics:** `http://localhost:9090`