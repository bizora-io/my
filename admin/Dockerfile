FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY admin/package.json ./admin/
COPY shared/package.json ./shared/
RUN npm install -w admin -w shared 2>/dev/null || npm install
COPY shared ./shared
COPY admin ./admin
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/admin
RUN npm run build

FROM nginx:alpine AS runner
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
