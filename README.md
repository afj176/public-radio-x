# 📻 Web Radio Application 🎶

Welcome to the Public Radio Streaming Application! This project allows users to tune into a variety of public radio stations from around the globe, right from their device. 📱🌐

## Description
This project is a public radio streaming application designed to provide users with easy access to a wide array of live radio broadcasts. Whether you're looking for news, music, or talk shows, this application aims to be your go-to platform for public radio entertainment.

## 🌟 Features

### ✅ Core Features
- User Authentication (Login/Register)
- Browse and Stream Radio Stations (with search and genre filtering)
- Manage Favorite Stations
- Create and Manage Custom Station Lists
- View Recently Played Stations
- Dark/Light Theme Toggle

### 🚀 Planned Features
(A more detailed roadmap for these planned features will be available soon.)
- Sleep Timer
- Alarm Clock Functionality
- Offline Downloads (for podcasts or specific shows if applicable)
- Enhanced Song/Artist Information Display (currently basic)
- User Profile Management (e.g., change password, view detailed listening history)
- Social Sharing of Stations/Shows
- Admin panel for station management (for administrators)

## 💻 Technologies Used
**Client (📱):**
- React Native (using Expo)
- TypeScript

**Server (🌐):**
- Node.js
- Express
- TypeScript
- PostgreSQL (Database)
- Redis (Caching)

**Containerization / Development Environment:**
- Docker
- Docker Compose

## 🚀 Getting Started

### Recommended Local Setup (Docker)
This is the easiest way to get the entire application stack (frontend, backend, database, cache) running on your local machine.

**Prerequisites:**
- Docker Desktop (or Docker Engine + Docker Compose CLI plugin)
- Git (for cloning the repository)

**Instructions:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repository-name.git # Replace with actual URL
    cd your-repository-name # Replace with actual directory name
    ```
2.  **Start the application stack:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the Docker images for the client and server if they don't exist or if code has changed.
    *   Start all services defined in `docker-compose.yml` (frontend, backend, postgres, redis) in detached mode (`-d`).
    *   The first time you run this, it might take a few minutes to download Docker images and build the application.

3.  **Accessing the application:**
    *   Frontend (Web): `http://localhost:8081` (Nginx serving the client build)
    *   Backend API: `http://localhost:3000`
    *   PostgreSQL Database: Accessible on host port `5433` (Connect with user `radio_pg_user`, password `radio_pg_password`, database `radio_app_db`)
    *   Redis: Accessible on host port `6379`

4.  **Database Initialization:**
    The first time the `postgres` service starts with an empty data volume, it will automatically execute the `init_db.sql` script to create the necessary tables and insert a default user. You can check the logs for confirmation:
    ```bash
    docker-compose logs postgres
    ```

5.  **Stopping the application:**
    ```bash
    docker-compose down
    ```
    To remove the data volumes (PostgreSQL data, Redis data) as well, you can use:
    ```bash
    docker-compose down -v
    ```

<details>
<summary>Alternative: Manual Setup for Individual Components (Advanced)</summary>

If you prefer to run the client or server natively for development on a specific component (without Docker for that part), you can follow these steps. Ensure PostgreSQL and Redis instances are running and accessible (e.g., started via `docker-compose up -d postgres redis` or installed natively) if running the server manually.

**Prerequisites (Manual):**
- Node.js: ^18.0.0 (LTS recommended)
- npm (comes with Node.js)
- Expo CLI: `npm install -g expo-cli` (for client development)
- Access to a running PostgreSQL instance and Redis instance.

**Server (Manual):**
1. Navigate to the `server` directory: `cd server`
2. Install dependencies: `npm install`
3. Set up required environment variables for database and Redis connection (e.g., in an `.env` file or directly in your shell). Refer to `docker-compose.yml` for variable names (e.g., `PGHOST=localhost`, `PGPORT=5433` (if using Docker's mapped port), `REDIS_HOST=localhost`, `REDIS_PORT=6379`).
4. Ensure the database schema from `init_db.sql` has been applied to your PostgreSQL instance.
5. Start the server: `npm run dev` (for development with Nodemon) or `npm start` (for production build). It typically runs on `http://localhost:3000`.

**Client (Manual - Expo Go / Web Dev Server):**
1. Navigate to the `client` directory: `cd client`
2. Install dependencies: `npm install`
3. Start the Expo development server: `npm start`
   This will open the Expo developer tools. You can run the app on:
   - An Android or iOS simulator/emulator.
   - Your physical Android or iOS device using the Expo Go app.
   - In your web browser for web development (usually on `http://localhost:8080` or similar).

</details>

## ⚙️ Key Configurations & Environment Variables

The primary configuration for the services (backend, frontend, database, cache) when running with Docker Compose is managed within the `docker-compose.yml` file at the root of the project. This includes service image versions, port mappings, and environment variables.

Here are some of the key environment variables used by the services:

**Backend Service (`backend`):**
*   `PGHOST`: Hostname for the PostgreSQL service (defaults to `postgres` as defined in `docker-compose.yml`).
*   `PGUSER`: PostgreSQL username (e.g., `radio_pg_user`). This should match the `POSTGRES_USER` in the `postgres` service.
*   `PGPASSWORD`: PostgreSQL password (e.g., `radio_pg_password`). This should match the `POSTGRES_PASSWORD` in the `postgres` service.
*   `PGDATABASE`: PostgreSQL database name (e.g., `radio_app_db`). This should match the `POSTGRES_DB` in the `postgres` service.
*   `PGPORT`: Port for PostgreSQL (defaults to `5432` within the Docker network).
*   `REDIS_HOST`: Hostname for the Redis service (defaults to `redis` as defined in `docker-compose.yml`).
*   `REDIS_PORT`: Port for Redis (defaults to `6379` within the Docker network).
*   `NODE_ENV`: Node environment (e.g., `development` or `production`).

**PostgreSQL Service (`postgres`):**
*   `POSTGRES_USER`: Sets the superuser username for the PostgreSQL instance.
*   `POSTGRES_PASSWORD`: Sets the superuser password for the PostgreSQL instance.
*   `POSTGRES_DB`: Sets the name of the default database to be created when the instance is initialized.

**Redis Service (`redis`):**
*   (No specific environment variables are set for the Redis service in the provided `docker-compose.yml` for its core operation, as it uses default Redis configurations. Password or custom configs would be set here if needed.)

**Note:** For a typical local setup using `docker-compose up`, these variables are pre-configured in `docker-compose.yml` to work together. You generally do not need to change them unless you have specific local requirements (e.g., external database/Redis, port conflicts you wish to change *within* the compose file for inter-service communication, though host port mappings are more common for resolving local conflicts). If you modify these, ensure consistency across services (e.g., backend's `PGUSER` must align with `postgres` service's `POSTGRES_USER`).

## 📂 High-Level Project Structure

```
.
├── client/                 # React Native (Expo) frontend application
│   ├── Dockerfile          # Dockerfile for building the client (web export)
│   └── nginx.conf          # Nginx configuration for serving the client
│   └── ...                 # Client source code, components, etc.
├── server/                 # Node.js (Express) backend application
│   ├── Dockerfile          # Dockerfile for building the server
│   └── ...                 # Server source code, routes, services, etc.
├── docker-compose.yml      # Docker Compose file to orchestrate all services
├── init_db.sql             # Database initialization script (used by PostgreSQL in Docker)
└── README.md               # This file
```
*   **`client/`**: Contains the React Native (Expo) frontend application. The `Dockerfile` here builds the web version of the app, and `nginx.conf` is used by Nginx (within Docker) to serve it.
*   **`server/`**: Contains the Node.js (Express) backend API. Its `Dockerfile` packages the server. The `init_db.sql` (located at the project root and mounted into the PostgreSQL container) is used to set up the initial database schema.
*   **`docker-compose.yml`**: Defines and configures all the services (frontend, backend, postgres, redis) and how they run together in a containerized environment for local development.
*   **`Dockerfile`s**: Located within `client/` and `server/`, these files define how to build the Docker images for each respective service.
*   **`init_db.sql`**: Located at the project root, this script sets up the database schema and initial data for PostgreSQL when the services are first launched with `docker-compose up`.

## 📻 Featured Radio Stations
Here are a few sample stations to get you started:

| Name                  | Genre        | Stream URL                             |
|-----------------------|--------------|----------------------------------------|
| Classic Rock Hits     | Rock         | http://stream.example.com/classic-rock |
| Jazz Vibes            | Jazz         | http://stream.example.com/jazz-vibes   |
| News Talk Central     | News/Talk    | http://stream.example.com/news-talk    |
| Electronic Beats      | Electronic   | http://stream.example.com/electronic   |

*Note: This is a sample list. More stations can be found within the application!*
