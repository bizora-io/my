# Bizora frontend (static)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/
RUN npm install -w frontend -w shared 2>/dev/null || npm install
COPY shared ./shared
COPY frontend ./frontend
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/frontend
RUN npm run build

FROM nginx:alpine AS runner
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
