# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js >= 16
- MongoDB
- Redis
- Nginx
- SSL certificates

## Environment Setup

### 1. Environment Variables

Create `.env` files for different environments:

```bash
# .env.production
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/gape_mvp
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-production-secret
CORS_ORIGIN=https://your-domain.com
```

### 2. SSL Certificates

Place SSL certificates in `/infrastructure/nginx/ssl/`:
- `certificate.crt`
- `private.key`

## Deployment Steps

### 1. Build Docker Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker-compose -f docker-compose.prod.yml build backend
```

### 2. Database Setup

```bash
# Initialize MongoDB replica set
docker-compose -f docker-compose.prod.yml exec mongodb mongo --eval "rs.initiate()"

# Create indexes
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

### 3. Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Health Checks

```bash
# Check backend health
curl https://your-domain.com/health

# Check MongoDB
docker-compose -f docker-compose.prod.yml exec mongodb mongo --eval "rs.status()"

# Check Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## Monitoring Setup

### 1. Prometheus

```bash
# Check Prometheus targets
curl http://localhost:9090/targets

# Test PromQL
curl http://localhost:9090/api/v1/query?query=up
```

### 2. Grafana

1. Access Grafana: http://localhost:3000
2. Default credentials: admin/admin
3. Add Prometheus data source
4. Import dashboards from `/infrastructure/grafana/dashboards/`

## Backup Procedures

### 1. Database Backup

```bash
# Backup MongoDB
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup/

# Backup Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli SAVE
```

### 2. Application Backup

```bash
# Backup volumes
docker run --rm -v gape_mongodb_data:/data -v /backup:/backup alpine tar cvf /backup/mongodb_data.tar /data
```

## Scaling

### 1. Horizontal Scaling

```bash
# Scale backend service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale frontend service
docker-compose -f docker-compose.prod.yml up -d --scale frontend=2
```

### 2. Vertical Scaling

Update resource limits in `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Troubleshooting

### 1. Container Issues

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View container logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]
```

### 2. Application Issues

```bash
# Check application logs
docker-compose -f docker-compose.prod.yml exec backend pm2 logs

# Check error rates
curl http://localhost:9090/api/v1/query?query=http_requests_total{status_code="5xx"}
```

### 3. Database Issues

```bash
# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs mongodb

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis
```

## Rollback Procedures

### 1. Application Rollback

```bash
# Roll back to previous version
docker-compose -f docker-compose.prod.yml down
docker image tag gape-backend:current gape-backend:backup
docker image tag gape-backend:previous gape-backend:current
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Database Rollback

```bash
# Restore MongoDB backup
docker-compose -f docker-compose.prod.yml exec mongodb mongorestore /backup/

# Restore Redis backup
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
docker-compose -f docker-compose.prod.yml exec redis redis-cli RESTORE
```

## Security Checklist

- [ ] SSL certificates installed
- [ ] Environment variables secured
- [ ] Firewall rules configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Monitoring alerts set up
- [ ] Backup procedures tested
- [ ] Access controls verified
- [ ] Logging enabled
- [ ] Security scanning completed
