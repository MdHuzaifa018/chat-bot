import { app } from "./app.js";
import { env } from "./config/env.js";
import { AccountAuthService } from "./services/accountAuth.service.js";

const PORT = env.port;

async function startServer(): Promise<void> {
  await AccountAuthService.bootstrapFirstAdmin(env.bootstrapAdmin.email, env.bootstrapAdmin.password);

  const server = app.listen(PORT, () => {
    console.log(`🚀 Chatbot Backend running on port ${PORT}`);
    console.log(`📡 Endpoints available under http://localhost:${PORT}/api`);
    console.log(`🔒 Allowed CORS Origin: ${env.security.allowedOrigin}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(err.code === "EADDRINUSE" ? `Port ${PORT} is already in use.` : "Server listen error:", err);
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => process.exit(0));
  });
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

