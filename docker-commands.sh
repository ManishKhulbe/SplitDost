#!/bin/bash
# Quick reference commands for SplitDost Docker Compose

# Start everything
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Restart services
docker-compose restart

# Rebuild images
docker-compose build --no-cache

# Check service status
docker-compose ps

# Run backend migrations
docker-compose exec backend npm run migrate

# Access database shell
docker-compose exec db psql -U postgres -d splitdost

# View database status
docker-compose exec backend npm run migrate:status

# Seed database
docker-compose exec backend npm run seed

# Clean up (remove stopped containers)
docker-compose down

# Full cleanup (remove containers, networks, and volumes)
docker-compose down -v

# View resource usage
docker stats

# Test backend health
curl http://localhost:3000/health

# Test frontend
curl http://localhost

echo "✅ SplitDost is running!"
echo "📱 Frontend: http://localhost"
echo "🔧 Backend: http://localhost:3000"
echo "💾 Database: localhost:5432"
