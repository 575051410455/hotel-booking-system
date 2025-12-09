import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serveStatic } from 'hono/bun';
import { swaggerUI } from '@hono/swagger-ui';
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import logsRoutes from "./routes/logs";
import bookingRoutes from "./routes/booking";




const app = new Hono();
app.use("*", prettyJSON());
app.use("*", secureHeaders());
app.use("*", logger());




// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}))

// Routes
const apiRoutes = app.basePath("/api")
    .route("/auth", authRoutes)
    .route("/users", usersRoutes)
    .route("/logs", logsRoutes)
    .route('/bookings', bookingRoutes)


// Health check
app.get("/", (c) => {
  return c.json({ message: "API is running" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});


// 404
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});


// Swagger UI route
app.get("/docs", swaggerUI({ url: "/api/openapi.json" }));


// OpenAPI spec endpoint
app.get("/api/openapi.json", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "API documentation",
    },
    servers: [
      {
        url: "/api",
        description: "API server",
      },
    ],
    paths: {
      "/auth/login": {
        post: {
          summary: "User login",
          tags: ["auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful login",
            },
          },
        },
      },
      // Add more paths here
    },
  });
});


app.get("*", serveStatic({ root: '../frontend/dist'}))
app.get("*", serveStatic({ path: '../frontend/dist/index.html'}))

export default app;
export type ApiRoutes = typeof apiRoutes