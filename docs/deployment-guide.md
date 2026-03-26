# Deployment Guide

Instructions for deploying the monorepo to production environments.

## Pre-Deployment Checklist

- [ ] All tests passing (`pnpm test` + `pnpm test:e2e`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Code formatted (`pnpm format`)
- [ ] No security issues in dependencies (`npm audit`)
- [ ] All environment variables documented
- [ ] Database migrations tested locally
- [ ] Docker images build successfully
- [ ] Health check endpoints verified

---

## Environment Setup

### Production Environment Variables

**Create a `.env.prod` file** (never commit):

```bash
# Node
NODE_ENV=production

# Ports
WEB_PORT=3000
API_PORT=3001
AUTH_PORT=3002
AUTH_GRPC_PORT=5001

# URLs
WEB_URL=https://yourdomain.com
API_URL=https://yourdomain.com
AUTH_SERVICE_URL=https://yourdomain.com
AUTH_GRPC_URL=auth:5001

# Secrets (generate strong values)
JWT_SECRET=<generate: openssl rand -base64 32>
SESSION_SECRET=<generate: openssl rand -base64 32>

# Database (use managed service or dedicated host)
AUTH_DATABASE_URL=postgresql://user:password@db-host:5432/monorepo_auth
API_DATABASE_URL=postgresql://user:password@db-host:5432/monorepo_api

# Redis (for BullMQ)
REDIS_URL=redis://redis-host:6379
BULLMQ_ENABLED=true

# RabbitMQ (optional)
RABBITMQ_URL=amqp://user:password@rabbitmq-host:5672
RABBITMQ_ENABLED=true

# Auth
JWT_EXPIRY=7d

# Traefik (HTTPS + TLS)
ACME_EMAIL=letsencrypt@yourdomain.com
```

### Secret Management Best Practices

**Never commit secrets**:
```bash
✓ Use environment variables
✓ Use secret management service (AWS Secrets Manager, Vault)
✓ Use CI/CD secrets
✗ Don't hardcode in code
✗ Don't commit .env files
```

**Generate strong secrets**:
```bash
# JWT_SECRET and SESSION_SECRET (minimum 32 characters)
openssl rand -base64 32

# PostgreSQL password
openssl rand -hex 16
```

---

## Docker Deployment

### Build Production Images

```bash
# Build all images
docker compose -f docker-compose.prod.yml build

# Verify images
docker images | grep monorepo

# Tag for registry (e.g., DockerHub)
docker tag monorepo-web:latest yourregistry/monorepo-web:latest
docker tag monorepo-api:latest yourregistry/monorepo-api:latest
docker tag monorepo-auth:latest yourregistry/monorepo-auth:latest

# Push to registry
docker push yourregistry/monorepo-web:latest
docker push yourregistry/monorepo-api:latest
docker push yourregistry/monorepo-auth:latest
```

### Docker Compose Production Stack

**File**: `docker-compose.prod.yml`

**Key Differences from Dev**:
- No volume mounts (built-in source)
- HTTPS with Let's Encrypt ACME
- Requires external secrets
- Database persistence required
- Health checks enabled

**Start Production Stack**:

```bash
# Set environment variables first
export $(cat .env.prod | xargs)

# Start services
docker compose -f docker-compose.prod.yml up -d

# Verify services are healthy
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f auth
docker compose -f docker-compose.prod.yml logs -f web
```

---

## Database Initialization

### First-Time Setup

**1. Create Databases**:

```sql
-- Connect as postgres superuser
psql -U postgres

-- Create databases
CREATE DATABASE monorepo_auth;
CREATE DATABASE monorepo_api;

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Verify
\l  -- List databases
```

**2. Run Migrations**:

```bash
# Inside container or with environment vars set
pnpm db:migrate:auth
pnpm db:migrate:api

# Or push schema directly (no migration files)
pnpm db:push:auth
pnpm db:push:api
```

**3. Seed Default Data**:

```bash
# Projects table auto-seeds on first API startup
# Seed 3 default projects: "Project Alpha", "Project Beta", "Project Gamma"
```

### Database Backup Strategy

**Automated Backups**:

```bash
#!/bin/bash
# backup-databases.sh
BACKUP_DIR="/backups/databases"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup auth database
pg_dump -U postgres -h db-host monorepo_auth > \
  $BACKUP_DIR/monorepo_auth_$TIMESTAMP.sql

# Backup api database
pg_dump -U postgres -h db-host monorepo_api > \
  $BACKUP_DIR/monorepo_api_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

# Encrypt sensitive backups
gpg --encrypt --recipient YOUR_KEY_ID \
  $BACKUP_DIR/monorepo_auth_$TIMESTAMP.sql
```

**Schedule with cron** (daily at 2 AM):

```bash
0 2 * * * /path/to/backup-databases.sh
```

---

## Health Checks & Monitoring

### Health Check Endpoints

**API Service**:
```bash
curl http://localhost:3001/health
# Response: 200 OK { "status": "up" }
```

**Used by Traefik** for load balancing and failover.

### Docker Health Checks

```yaml
# In docker-compose.prod.yml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Monitoring Setup (Optional)

**Prometheus + Grafana**:

```bash
# Add metrics middleware to NestJS
npm install @nestjs/terminus prom-client

# Expose /metrics endpoint
app.get('/metrics', async () => {
  return register.metrics();
});
```

**Traefik Metrics**:
```yaml
# docker-compose.prod.yml
traefik:
  command:
    - "--metrics.prometheus=true"
    - "--metrics.prometheus.entryPoint=metrics"
  ports:
    - "8082:8082"  # Metrics endpoint
```

---

## SSL/TLS Configuration

### Traefik HTTPS Setup

**Let's Encrypt ACME** (automatic certificate provisioning):

```yaml
# docker-compose.prod.yml
traefik:
  environment:
    - ACME_EMAIL=your-email@domain.com
    - ACME_STORAGE=/letsencrypt/acme.json
  volumes:
    - ./letsencrypt:/letsencrypt
  command:
    - "--entrypoints.websecure.address=:443"
    - "--certificatesResolvers.letsencrypt.acme.email=your-email@domain.com"
    - "--certificatesResolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    - "--certificatesResolvers.letsencrypt.acme.httpChallenge.entryPoint=web"
```

**Automatic HTTP → HTTPS Redirect**:

```yaml
traefik:
  services:
    api:
      entrypoints:
        - websecure
      tls:
        certResolver: letsencrypt
```

### Manual Certificate Setup

If using custom certificates:

```bash
# Generate self-signed certificate (testing only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Mount in docker-compose
volumes:
  - ./certs:/certs
```

---

## Scaling Strategies

### Horizontal Scaling (Multiple Instances)

**With Traefik Load Balancing**:

```bash
# Start multiple API instances
docker compose -f docker-compose.prod.yml up -d --scale api=3

# Traefik automatically routes to all healthy instances
```

**with Kubernetes** (recommended for production):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: yourregistry/monorepo-api:latest
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
```

### Connection Pool Sizing

**PostgreSQL**:
```
max_connections per instance = 10 (postgres.js default)
Total = 10 × (number of API instances) + buffer
```

Example for 3 API instances:
```sql
ALTER SYSTEM SET max_connections = 40;
ALTER SYSTEM SET shared_buffers = '256MB';
-- Apply changes
SELECT pg_reload_conf();
```

### Redis Scaling

**Single Instance Setup** (current):
```
REDIS_URL=redis://redis-host:6379
```

**Redis Cluster** (high availability):
```bash
# Create cluster nodes
redis-server --port 7000 --cluster-enabled yes
redis-server --port 7001 --cluster-enabled yes
# ... etc

# Create cluster
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 ...

# Connect from app
REDIS_URL=redis-cluster://redis-host:7000,redis-host:7001,...
```

---

## Continuous Deployment (CI/CD)

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test && pnpm test:e2e

      - name: Build
        run: pnpm build

      - name: Build Docker images
        run: docker compose -f docker-compose.prod.yml build

      - name: Push to registry
        env:
          REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
        run: |
          echo $REGISTRY_TOKEN | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push yourregistry/monorepo-web:latest
          docker push yourregistry/monorepo-api:latest
          docker push yourregistry/monorepo-auth:latest

      - name: Deploy to server
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh -i ~/.ssh/id_ed25519 deploy@$DEPLOY_HOST 'cd /app && \
            docker compose -f docker-compose.prod.yml pull && \
            docker compose -f docker-compose.prod.yml up -d'
```

### Deployment Steps

```bash
#!/bin/bash
# deploy.sh
set -e

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Run migrations (if any)
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm db:migrate:auth
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm db:migrate:api

# Start services with zero downtime
docker compose -f docker-compose.prod.yml up -d \
  --no-deps --build api auth web

# Wait for health checks
sleep 10

# Verify all services are healthy
docker compose -f docker-compose.prod.yml ps | grep healthy

echo "Deployment complete!"
```

---

## Zero-Downtime Deployments

### Rolling Deployment Strategy

**1. Health Check Ready**:
```bash
# All services expose /health endpoint
curl http://api-instance:3001/health
```

**2. Start New Instance**:
```bash
docker compose -f docker-compose.prod.yml up -d --scale api=2
```

**3. Verify New Instance**:
```bash
# Wait for health check to pass
docker compose -f docker-compose.prod.yml ps | grep "api_2"
```

**4. Remove Old Instance**:
```bash
docker compose -f docker-compose.prod.yml up -d --scale api=1
```

**5. Verify Service Still Running**:
```bash
curl https://yourdomain.com/health
```

### Blue-Green Deployment

**Maintain two full environments**:

```bash
# Blue environment (current production)
docker compose -f docker-compose.prod.yml up -d

# Green environment (new version)
docker compose -f docker-compose.prod.yml.green up -d

# Switch Traefik routing
# Update service labels to route to green

# Monitor for issues
sleep 30

# If stable, keep green; if issues, revert to blue
```

---

## Rollback Procedures

### Rollback to Previous Docker Image

```bash
# View image history
docker image history monorepo-api:latest

# Tag previous working image
docker tag monorepo-api:v1.2.3 monorepo-api:latest

# Restart services
docker compose -f docker-compose.prod.yml restart api
```

### Database Rollback

**If Migration Breaks Data**:

```bash
# Restore from backup
psql -U postgres -d monorepo_api < /backups/monorepo_api_20260325_020000.sql

# Revert code to previous tag
git checkout v1.2.3

# Rebuild and restart
pnpm build
docker compose -f docker-compose.prod.yml restart api
```

---

## Troubleshooting Deployment

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
# - Image not found

# Verify environment
docker compose -f docker-compose.prod.yml config | grep -A 10 "environment:"
```

### Database Connection Issues

```bash
# Test connection
psql -U postgres -h db-host -d monorepo_auth -c "SELECT 1;"

# Check pg_hba.conf for authentication method
# Verify credentials in DATABASE_URL
# Check firewall rules (port 5432)
```

### Traefik Routing Not Working

```bash
# Access Traefik dashboard
http://localhost:8080

# Check configured routes
# Verify service labels
# Check middleware configuration

# Test routing manually
curl -v http://localhost/api/health
```

### Redis/RabbitMQ Unavailable

```bash
# Check if services are running
docker compose -f docker-compose.prod.yml ps redis rabbitmq

# BullMQ will fail gracefully if BULLMQ_ENABLED=false
# RabbitMQ will fail gracefully if RABBITMQ_ENABLED=false

# To temporarily disable:
export BULLMQ_ENABLED=false
export RABBITMQ_ENABLED=false
docker compose -f docker-compose.prod.yml restart api
```

---

## Performance Optimization

### Image Build Caching

```dockerfile
# Dockerfile
FROM node:24-alpine AS base
WORKDIR /app

# Cache dependencies layer
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source (changes frequently)
COPY . .
RUN pnpm build
```

### Database Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Check query plans
EXPLAIN ANALYZE SELECT * FROM projects WHERE status = 'completed';
```

### Redis Configuration

```bash
# docker-compose.prod.yml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  # Limits memory and uses LRU eviction for old job data
```

---

## Security Hardening

### Secrets Rotation

```bash
# Rotate JWT_SECRET
# 1. Deploy new secret
# 2. Keep old secret for 7 days (JWT expiry)
# 3. All new tokens use new secret
# 4. Old tokens still valid for 7 days
# 5. Remove old secret after 7 days

# Rotate SESSION_SECRET
# 1. Deploy new secret
# 2. All existing sessions invalidated
# 3. Users re-login

# Rotate DATABASE_PASSWORD
# 1. Update PostgreSQL user password
# 2. Update environment variable
# 3. Restart all services
# 4. Verify connections working
```

### Network Security

```yaml
# docker-compose.prod.yml
networks:
  internal:
    driver: bridge
    internal: true  # No external access

services:
  api:
    networks:
      - internal
      - public

  postgres:
    networks:
      - internal  # No external access
```

### Access Control

```bash
# Restrict SSH access
ssh -i private-key deploy@server

# Firewall rules (allow only necessary ports)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw default deny incoming
```

---

## Disaster Recovery Plan

### RTO/RPO Targets

| Component | RTO | RPO |
|-----------|-----|-----|
| Web App | 15 min | 0 min (stateless) |
| API Service | 15 min | 5 min |
| Auth Service | 15 min | 5 min |
| Database | 1 hour | 1 hour |
| Redis | 1 day | N/A (temporary) |

### Recovery Procedures

**1. Service Failure**:
- Traefik health check detects unhealthy instance
- Removes from load balancer
- Alert team
- Restart service: `docker compose restart api`

**2. Database Failure**:
- All services fail on first query
- Team alerted
- Restore from backup: `psql < backup.sql`
- Restart services
- Verify data integrity

**3. Complete Data Center Failure**:
- All services down
- Activate backup data center
- Restore from latest backup
- Update DNS to backup center

---

## Checklist Before Going Live

- [ ] All tests passing in CI/CD
- [ ] Secrets stored in secrets manager (not .env files)
- [ ] SSL/TLS certificate valid (check expiry date)
- [ ] Health checks configured and working
- [ ] Database backups automated and tested
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested
- [ ] Team trained on deployment procedures
- [ ] Load testing completed (target: 100+ concurrent users)
- [ ] Security audit completed
- [ ] Disaster recovery tested
- [ ] Documentation updated
- [ ] Incident response plan ready
