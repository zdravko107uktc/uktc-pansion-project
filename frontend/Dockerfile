FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Same-origin: the app calls /api/v1/... and nginx (see nginx.conf) proxies /api/ to the backend.
# Keep this empty — the API client appends /api/v1 itself, so a value like "/api" would produce
# a broken /api/api/v1 path that 404s.
ENV REACT_APP_API_URL=""

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
