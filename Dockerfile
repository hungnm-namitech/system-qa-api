FROM node:20.13.1-alpine3.19 AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run prisma generate && npm run build

FROM node:20.13.1-alpine3.19 as prod-deps
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY . .
COPY --from=development /usr/src/app/node_modules ./node_modules
RUN npm pkg delete scripts.prepare
RUN npm install --omit=dev

FROM node:20.13.1-alpine3.19
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY . .
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/dist ./dist
CMD /bin/sh -c "npm run db:migrate:prod && npm run start:prod"
