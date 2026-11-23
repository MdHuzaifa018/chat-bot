import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { ApiError } from "./utils/apiError.js";

export const app = express();

// Security HTTP headers (configured to allow cross-origin widget embeds)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration: Allow official frontend, plus public access for /api/widget endpoints
const allowedOrigins = new Set([
  env.security.allowedOrigin,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
]);

app.use((req, res, next) => {
  const publicWidgetRequest = req.path.startsWith("/api/widget/");
  const corsMiddleware = cors({
    origin: publicWidgetRequest
      ? "*"
      : (incomingOrigin, callback) => {
          if (!incomingOrigin) return callback(null, true);
          if (allowedOrigins.has(incomingOrigin)) return callback(null, incomingOrigin);
          try {
            const host = new URL(incomingOrigin).hostname;
            if (host === "localhost" || host === "127.0.0.1") {
              return callback(null, incomingOrigin);
            }
          } catch {
            // invalid URL
          }
          return callback(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This frontend origin is not allowed."));
        },
    credentials: !publicWidgetRequest,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    maxAge: 600,
  });
  corsMiddleware(req, res, next);
});

// Body parsers & Cookie parser
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// Disable x-powered-by header
app.disable("x-powered-by");

// Serve static assets (such as standalone widget.js)
app.use(express.static("public"));

// Mount API routes
app.use("/api", apiRouter);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested endpoint does not exist.",
    },
  });
});

// Centralized error handler
app.use(errorHandler);
