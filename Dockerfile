FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html .
COPY src ./src
COPY tsconfig.json tailwind.config.ts postcss.config.js vite.config.ts ./
RUN npm run build

FROM nginx:stable-alpine
ENV NGINX_ENVSUBST_FILTER=^NORMBUILD_BACKEND_URL$
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
