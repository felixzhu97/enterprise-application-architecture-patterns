# Deployment Guide

This guide covers deploying the Enterprise Architecture Patterns demonstration application across different environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Logging](#monitoring--logging)

## Prerequisites

### System Requirements

- **Node.js**: v18.x or higher
- **PostgreSQL**: v13.x or higher
- **Redis**: v6.x or higher (for caching and session storage)
- **Docker**: v20.x or higher (for containerized deployment)

### Environment Variables

Required environment variables:

```env
NODE_ENV=development|production
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=architecture_patterns
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_SECRET=your_super_secret_key_here
JWT_SECRET=your_jwt_secret_here
```

## Local Development

### Quick Start

1. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd software-architecture-guide
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

   Application will be available at `http://localhost:3000`

## Docker Deployment

### Development with Docker

1. **Build and Run**:
   ```bash
   docker-compose up --build
   ```

2. **Services Included**:
   - **app**: Main application (port 3000)
   - **postgres**: PostgreSQL database (port 5432)
   - **redis**: Redis cache (port 6379)

## Production Deployment

### Server Setup

1. **Prepare Server**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git nginx
   sudo npm install -g pm2
   ```

2. **Application Deployment**:
   ```bash
   git clone <repository-url> /var/www/architecture-patterns
   cd /var/www/architecture-patterns
   npm ci --only=production
   npm run build
   ```

3. **PM2 Process Management**:
   ```bash
   pm2 start src/app.js --name architecture-patterns
   pm2 save
   pm2 startup
   ```

For more information, see [docs/ARCHITECTURE_PATTERNS.md](docs/ARCHITECTURE_PATTERNS.md).
