# Multi-stage Dockerfile para LEVEL TRAP en Producción
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Imagen de producción ligera
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Crear usuario sin privilegios para máxima seguridad
USER node

COPY --chown=node:node --from=builder /app /app

EXPOSE 3000

CMD ["node", "src/server.js"]

