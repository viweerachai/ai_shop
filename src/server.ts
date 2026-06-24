import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerApiRoutes } from "./api/routes.js";
import { config } from "./config.js";
import { startScheduler } from "./scheduler.js";
import { logger } from "./utils/logger.js";

const app = Fastify({ logger: false });
await app.register(cors, { origin: true });
await registerApiRoutes(app);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../web-dist");
if (existsSync(root)) {
  await app.register(fastifyStatic, { root });
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
}

if (config.hasGoogleCredentials && config.hasGeminiCredentials && config.hasAnthropicCredentials) {
  startScheduler();
}

await app.listen({ port: config.port, host: "0.0.0.0" });
logger.info({ port: config.port, mode: config.hasGoogleCredentials ? "live" : "demo" }, "AI Shop server started");
