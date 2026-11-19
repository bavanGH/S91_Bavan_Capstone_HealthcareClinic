FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node

EXPOSE 5000
CMD ["npm", "start"]
