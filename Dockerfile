# Production image: Next.js + Python ingestion pipeline
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies first for better Docker layer caching.
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund

# Install Python dependencies.
COPY scraper/requirements.txt ./scraper/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r scraper/requirements.txt

# Copy application source.
COPY . .

RUN npm run build

COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
