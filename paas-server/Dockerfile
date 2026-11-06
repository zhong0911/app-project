# 构建阶段
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

# 运行阶段：需要 git 用于拉取源码，docker CLI 可选（平台主要通过 Docker API 操作）
FROM node:22-alpine
RUN apk add --no-cache git tini
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
