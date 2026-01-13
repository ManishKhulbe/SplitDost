# Docker Setup Guide for SplitDost

This guide explains how to run the SplitDost application using Docker and Docker Compose.

## Prerequisites

- Docker (latest version)
- Docker Compose (comes with Docker Desktop)
- Git

## Quick Start

### 1. Build and Run the Application

```bash
# From the root directory of the project
docker-compose up --build
```

This command will:

- Build the backend Docker image
- Build the frontend Docker image
- Create and start all services (PostgreSQL, Backend, Frontend)
- Set up the necessary networks and volumes

### 2. Access the Application

Once all containers are running:

- **Frontend**: http://localhost (Port 80)
- **Backend API**: http://localhost/api (proxied through Nginx)
- **Direct Backend Access**: http://localhost:3000 (Port 3000)
- **PostgreSQL**: localhost:5432

## Services Overview

### 1. Database (PostgreSQL)

- **Container Name**: `splitdost-db`
- **Port**: 5432 (internal) → 5432 (host)
- **Environment**: Configured from `.env` file
- **Volume**: `postgres_data` (persistent storage)
- **Health Check**: Enabled (waits for DB to be ready before starting backend)

### 2. Backend (Node.js + Express)

- **Container Name**: `splitdost-backend`
- **Port**: 3000 (internal) → 3000 (host)
- **Base Image**: node:18-alpine
- **Volumes**:
  - Source code mounted for development (`./backend/src:/app/src`)
  - node_modules excluded from mount
- **Depends On**: Database (waits for health check)

### 3. Frontend (React + Vite)

- **Container Name**: `splitdost-frontend`
- **Port**: 80 (internal) → 80 (host)
- **Web Server**: Nginx (Alpine)
- **Features**:
  - Serves built React application
  - API routing configured to proxy to backend
  - SPA routing support
  - Gzip compression enabled
  - Static asset caching

## Common Commands

### Start services

```bash
docker-compose up
```

### Start in background

```bash
docker-compose up -d
```

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (WARNING: deletes database data)

```bash
docker-compose down -v
```

### View logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Follow logs (live)
docker-compose logs -f
```

### Rebuild images

```bash
docker-compose build
```

### Run a command in a service

```bash
# Example: Run migrations
docker-compose exec backend npm run migrate

# Example: Access database
docker-compose exec db psql -U myuser -d splitdost
```

## Environment Variables

The application uses environment variables for configuration. These are set in `docker-compose.yml`:

- `DB_HOST=db` - Database hostname (Docker service name)
- `DB_PORT=5432` - Database port
- `DB_NAME=splitdost` - Database name
- `DB_USER=myuser` - Database user
- `DB_PASSWORD=mypass` - Database password
- `JWT_SECRET=splitdostmanish11jan2026` - JWT secret for auth
- `NODE_ENV=development` - Environment mode

To customize, create or modify a `.env` file at the root and adjust the values in `docker-compose.yml`.

## Development Workflow

### Hot Reloading Backend

The backend container has source code mounted, so changes to `./backend/src/**` files will be reflected instantly with nodemon.

### Frontend Development

To develop the frontend with Vite's hot reload:

1. Exit the production Docker container
2. Run Vite locally:

```bash
cd frontend
npm install
npm run dev
```

Or build the frontend image locally and run:

```bash
docker-compose up frontend
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs <service-name>

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Database connection error

- Wait for the database health check to pass (see logs)
- Verify DB_HOST is `db` (not `localhost`)
- Check environment variables in docker-compose.yml

### Port already in use

```bash
# Change port in docker-compose.yml
# For example, change "80:80" to "8080:80" for frontend
```

### Need to run migrations

```bash
docker-compose exec backend npm run migrate
```

## Production Considerations

For production deployment, consider:

1. **Environment Variables**: Use `.env` file or secrets management
2. **Database**:
   - Use a managed database service (AWS RDS, Heroku Postgres, etc.)
   - Update `DB_HOST` accordingly
3. **Frontend**:
   - Use a CDN for static assets
   - Enable HTTPS/SSL
4. **Backend**:
   - Set `NODE_ENV=production`
   - Use a process manager or orchestration (Kubernetes, etc.)
5. **Networking**:
   - Expose only necessary ports
   - Use reverse proxy with SSL termination

## File Structure

```
splitdost/
├── docker-compose.yml          # Main Docker Compose configuration
├── .dockerignore               # Files to exclude from Docker builds
├── backend/
│   ├── Dockerfile              # Backend container definition
│   ├── .dockerignore           # Backend-specific exclusions
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile              # Frontend container definition
│   ├── .dockerignore           # Frontend-specific exclusions
│   ├── nginx.conf              # Nginx configuration
│   ├── package.json
│   └── src/
└── README.md
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
