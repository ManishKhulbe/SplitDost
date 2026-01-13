# SplitDost Docker Compose Setup - Complete ✅

## Status

✅ **All services running successfully!**

### Services Running

- **Frontend**: Nginx serving React app at http://localhost
- **Backend**: Node.js + Express running at http://localhost:3000
- **Database**: PostgreSQL 15 running at localhost:5432

## Quick Start

### Start Services

```bash
cd /Users/manishkhulbe/Documents/splitdost
docker-compose up
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## Access Points

| Service           | URL                          | Port |
| ----------------- | ---------------------------- | ---- |
| Frontend          | http://localhost             | 80   |
| Backend API       | http://localhost:3000        | 3000 |
| Backend via Nginx | http://localhost/api         | 80   |
| Database          | localhost:5432               | 5432 |
| Health Check      | http://localhost:3000/health | 3000 |

## Database Access

### Via Docker

```bash
docker-compose exec db psql -U postgres -d splitdost
```

### Via Local Machine (if psql installed)

```bash
psql -h localhost -U postgres -d splitdost
```

**Default Password**: `mypass`

## Environment Variables

### Database Configuration

- `DB_HOST`: db (Docker service name)
- `DB_PORT`: 5432
- `DB_NAME`: splitdost
- `DB_USER`: postgres
- `DB_PASSWORD`: mypass

### Backend Configuration

- `PORT`: 3000
- `NODE_ENV`: development
- `JWT_SECRET`: splitdostmanish11jan2026

### Frontend Configuration

- `VITE_API_URL`: http://localhost/api (in production, via Nginx proxy)

## Key Features

✅ **Multi-stage Docker builds** - Optimized image sizes
✅ **Health checks** - Backend waits for DB readiness
✅ **Volume persistence** - Database data persists across restarts
✅ **Nginx reverse proxy** - Frontend routes /api to backend
✅ **SPA routing support** - React Router works correctly
✅ **Gzip compression** - Static assets compressed
✅ **Development ready** - Source code hot reload support

## Useful Commands

### Rebuild Images

```bash
docker-compose build --no-cache
```

### Run Migrations

```bash
docker-compose exec backend npm run migrate
```

### Seed Database

```bash
docker-compose exec backend npm run seed
```

### Check Service Status

```bash
docker-compose ps
```

### View Resource Usage

```bash
docker stats
```

### Remove Everything (including volumes)

```bash
docker-compose down -v
```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs

# Restart everything
docker-compose down -v
docker-compose up --build
```

### Port already in use

Edit `docker-compose.yml` and change the port mappings:

```yaml
ports:
  - "8080:80" # frontend on 8080 instead of 80
```

### Database connection errors

- Ensure `DB_HOST=db` (not localhost)
- Wait for health check to pass (see logs)
- Check database is initialized: `docker-compose logs db | grep 'ready to accept'`

### Frontend not connecting to backend

- Check Nginx logs: `docker-compose logs frontend`
- Verify API URL in frontend: should be relative path `/api` or `http://localhost/api`
- Check backend is responding: `curl http://localhost:3000/health`

## File Structure

```
splitdost/
├── docker-compose.yml          # Main configuration
├── .dockerignore               # Exclude files from Docker builds
├── backend/
│   ├── Dockerfile              # Backend container
│   ├── .dockerignore           # Backend exclusions
│   ├── package.json
│   └── src/
│       ├── server.js
│       └── config/
│           └── database.js
├── frontend/
│   ├── Dockerfile              # Frontend container
│   ├── .dockerignore           # Frontend exclusions
│   ├── nginx.conf              # Nginx configuration
│   ├── package.json
│   └── src/
└── DOCKER_SETUP.md             # Full Docker documentation
```

## Next Steps

1. **Test the application**:

   - Navigate to http://localhost
   - Sign up for an account
   - Create groups and track expenses

2. **Deploy to Production**:

   - Use managed database (AWS RDS, Heroku, etc.)
   - Set up environment variables properly
   - Configure HTTPS/SSL
   - Use a container registry (Docker Hub, ECR, etc.)

3. **Monitor & Scale**:
   - Use Docker Swarm or Kubernetes for orchestration
   - Set up logging and monitoring
   - Configure auto-scaling if needed

## Support

For issues, check:

- Docker Compose logs: `docker-compose logs`
- Docker documentation: https://docs.docker.com
- Service-specific documentation in DOCKER_SETUP.md
