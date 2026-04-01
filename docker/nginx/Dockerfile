FROM node:20-alpine AS client_build

WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client_build /client/dist /usr/share/nginx/html

EXPOSE 80
