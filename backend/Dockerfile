# Dockerfile pour le backend ERP PrevHub
# Auteur: Manus AI

FROM node:18-alpine

# Métadonnées
LABEL maintainer="Manus AI <support@manus.im>"
LABEL description="Backend API pour ERP PrevHub - Prévéris"
LABEL version="1.0.0"

# Installation des dépendances système
RUN apk add --no-cache \
    curl \
    bash \
    tzdata \
    && rm -rf /var/cache/apk/*

# Configuration du timezone
ENV TZ=Europe/Paris
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Création de l'utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Répertoire de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install --production && \
    npm cache clean --force

# Copie du code source
COPY --chown=nodejs:nodejs . .

# Création des répertoires nécessaires
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs uploads logs

# Changement vers l'utilisateur non-root
USER nodejs

# Exposition du port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Commande de démarrage
CMD ["node", "src/app.js"]

