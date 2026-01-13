# ---------- Build stage ----------
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src/ ./src/

RUN bun build src/index.ts --outdir dist --target bun --production

# ---------- Runtime stage ----------
FROM oven/bun:1-distroless

WORKDIR /app

COPY --from=builder /app/dist/ /app/

EXPOSE 3000/tcp
CMD ["index.js"]