#!/bin/bash
set -euxo pipefail
exec > >(tee /var/log/frota-bootstrap.log | logger -t frota-bootstrap -s 2>/dev/console) 2>&1

echo "[1/10] Instalando dependencias do host"
dnf update -y
dnf install -y docker git
systemctl enable --now docker
if ! docker compose version >/dev/null 2>&1; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL https://github.com/docker/compose/releases/download/v2.39.4/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

echo "[1.1/10] Criando swap temporario para build (instancia pequena)"
fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile || true
swapon /swapfile || true

mkdir -p /opt/frota
cd /opt/frota

if [ ! -d painelgeral ]; then
  git clone https://github.com/dmitrymarcelo/painelgeral.git painelgeral
fi
cd painelgeral

echo "[2/10] Descobrindo IP publico da EC2"
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
PUBLIC_IP=$(curl -sH "X-aws-ec2-metadata-token: ${TOKEN}" http://169.254.169.254/latest/meta-data/public-ipv4)
echo "PUBLIC_IP=${PUBLIC_IP}" | tee /opt/frota/public-ip.env

echo "[3/10] Gerando .env da API"
cat > apps/api/.env <<EOF
NODE_ENV=production
PORT=4000
API_PREFIX=api/v1
JWT_ACCESS_SECRET=quick_test_access_secret_change_later
JWT_REFRESH_SECRET=quick_test_refresh_secret_change_later
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
DEFAULT_TENANT_SLUG=frota-pro
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/frota_pro?schema=public
THROTTLE_TTL=60
THROTTLE_LIMIT=120
EOF

echo "[4/10] Gerando .env do Web (API publica da EC2)"
cat > apps/web/.env.production <<EOF
NEXT_PUBLIC_API_BASE_URL=http://${PUBLIC_IP}:4000/api/v1
EOF

echo "[5/10] Gerando Dockerfile da API"
cat > Dockerfile.ec2.api <<'EOF'
FROM node:22-bookworm
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @frota/types build && pnpm --filter @frota/api prisma:generate && pnpm --filter @frota/api build
EXPOSE 4000
CMD ["sh","-lc","sleep 20 && corepack enable && pnpm --filter @frota/api prisma:generate && pnpm --filter @frota/api prisma:push && (pnpm --filter @frota/api seed || true) && node apps/api/dist/src/main.js"]
EOF

echo "[6/10] Gerando Dockerfile do Web"
cat > Dockerfile.ec2.web <<'EOF'
FROM node:22-bookworm
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN pnpm --filter @frota/types build && pnpm --filter @frota/web build
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["sh","-lc","corepack enable && pnpm start"]
EOF

echo "[7/10] Gerando docker-compose de deploy all-in-one"
cat > docker-compose.ec2.yml <<EOF
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: frota_pro
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    restart: unless-stopped
    ports:
      - "6379:6379"

  api:
    build:
      context: .
      dockerfile: Dockerfile.ec2.api
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    env_file:
      - apps/api/.env
    ports:
      - "4000:4000"

  web:
    build:
      context: .
      dockerfile: Dockerfile.ec2.web
      args:
        NEXT_PUBLIC_API_BASE_URL: http://${PUBLIC_IP}:4000/api/v1
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "3000:3000"

volumes:
  pg_data:
EOF

echo "[8/10] Subindo stack via Docker Compose"
docker compose -f docker-compose.ec2.yml up -d --build

echo "[9/10] Aguardando inicializacao"
sleep 40

echo "[10/10] Estado final dos containers"
docker compose -f docker-compose.ec2.yml ps
curl -I http://localhost:3000 || true
curl -I http://localhost:4000/api/v1/health || true

echo "Bootstrap concluido. Web: http://${PUBLIC_IP}:3000 | API: http://${PUBLIC_IP}:4000/api/v1"
