import { app } from "./app.js";
import { env } from "./config/env.js";
import { AccountAuthService } from "./services/accountAuth.service.js";
import { execSync } from "node:child_process";

const PORT = env.port;

function tryFreePort(port: number): boolean {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr ":${port}"`, { encoding: "utf8" });
      const lines = output.trim().split("\n");
      const currentPid = process.pid;
      let killed = false;
      for (const line of lines) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && Number(pid) !== currentPid && Number(pid) > 0) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
              console.log(`[Server] Automatically freed port ${port} by terminating stale process ${pid}`);
              killed = true;
            } catch {
              // ignore
            }
          }
        }
      }
      return killed;
    } else {
      execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: "ignore" });
      return true;
    }
  } catch {
    return false;
  }
}

async function startServer(retried = false): Promise<void> {
  await AccountAuthService.bootstrapFirstAdmin(env.bootstrapAdmin.email, env.bootstrapAdmin.password);

  const server = app.listen(PORT, () => {
    console.log(`🚀 Chatbot Backend running on port ${PORT}`);
    console.log(`📡 Endpoints available under http://localhost:${PORT}/api`);
    console.log(`🔒 Allowed CORS Origin: ${env.security.allowedOrigin}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && !retried) {
      console.warn(`[Server] Port ${PORT} was busy. Attempting to free stale process and retry...`);
      const freed = tryFreePort(PORT);
      if (freed) {
        setTimeout(() => {
          startServer(true);
        }, 1000);
        return;
      }
    }
    console.error(err.code === "EADDRINUSE" ? `Port ${PORT} is already in use by another active application.` : "Server listen error:", err);
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

