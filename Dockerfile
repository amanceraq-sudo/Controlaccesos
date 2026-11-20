FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm install --workspace=@control-accesos/api --omit=dev

COPY apps/api ./apps/api

ENV NODE_ENV=production
ENV PORT=4000
ENV ENABLE_SOCKET=true
ENV CORS_ORIGIN=*

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@control-accesos/api"]
