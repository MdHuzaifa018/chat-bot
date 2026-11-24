import http from "node:http";
import { app } from "../src/app.js";
import { AccountAuthService } from "../src/services/accountAuth.service.js";
import { ACCOUNT_COOKIE_NAME } from "../middlewares/accountAuth.middleware.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  PASS: ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: errorMsg });
    console.error(`  FAIL: ${name} -> ${errorMsg}`);
  }
}

async function startServer(): Promise<{ server: http.Server; baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    server,
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function runEndpointValidationSuite() {
  console.log("\n=======================================================");
  console.log("RUNNING COMPREHENSIVE ENDPOINT VALIDATION SUITE");
  console.log("Testing: /api/health, /api/auth/login, /api/auth/me,");
  console.log("         /api/websites/crawl, /api/chat/message, /api/widget/config");
  console.log("=======================================================\n");

  const { baseUrl, close } = await startServer();

  try {
    // ----------------------------------------------------
    // 1. /api/health
    // ----------------------------------------------------
    await runTest("1. GET /api/health returns HTTP 200 with required schema properties", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      assert(body.status === "ok", "Expected status: ok");
      assert(typeof body.uptime === "number", "Expected numeric uptime");
      assert(typeof body.timestamp === "string", "Expected timestamp string");
      assert(typeof body.database === "string", "Expected database status string");
      assert(typeof body.gemini === "string", "Expected gemini status string");
    });

    // ----------------------------------------------------
    // 2. /api/auth/login & /api/auth/client/login & /api/auth/admin/login
    // ----------------------------------------------------
    await runTest("2.1 POST /api/auth/login with valid client credentials returns 200 and token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "dev_client", accessCode: "CR-demo-access-token" }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { authenticated: boolean; token: string; account: { accountType: string } };
      assert(body.authenticated === true, "Expected authenticated: true");
      assert(typeof body.token === "string" && body.token.length > 0, "Expected session token");
      assert(body.account.accountType === "client", "Expected accountType: client");
    });

    await runTest("2.2 POST /api/auth/login with invalid access code fails gracefully with 401", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "dev_client", accessCode: "CR-wrong-token-12345" }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_CREDENTIALS", "Expected code INVALID_CREDENTIALS");
    });

    await runTest("2.3 POST /api/auth/login with missing payload returns 400 schema error", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_CREDENTIALS", "Expected code INVALID_CREDENTIALS");
    });

    await runTest("2.4 POST /api/auth/client/login with short access code (<8 chars) returns 400", async () => {
      const res = await fetch(`${baseUrl}/api/auth/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "dev_client", accessCode: "short" }),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_CREDENTIALS", "Expected code INVALID_CREDENTIALS");
    });

    await runTest("2.5 POST /api/auth/admin/login with missing password returns 400", async () => {
      const res = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@curiousrabit.online" }),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_CREDENTIALS", "Expected code INVALID_CREDENTIALS");
    });

    // ----------------------------------------------------
    // 3. /api/auth/me
    // ----------------------------------------------------
    await runTest("3.1 GET /api/auth/me without token returns HTTP 401 UNAUTHORIZED", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "UNAUTHORIZED", "Expected error code UNAUTHORIZED");
    });

    await runTest("3.2 GET /api/auth/me with invalid Bearer token returns 401 UNAUTHORIZED", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: "Bearer bogus-token-12345" },
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "UNAUTHORIZED", "Expected error code UNAUTHORIZED");
    });

    await runTest("3.3 GET /api/auth/me with valid Bearer token returns 200 and session details", async () => {
      // First log in to obtain real token
      const loginRes = await AccountAuthService.loginClient("dev_client", "CR-demo-access-token");
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${loginRes.token}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { authenticated: boolean; account: { accountType: string } };
      assert(body.authenticated === true, "Expected authenticated: true");
      assert(body.account.accountType === "client", "Expected accountType: client");
    });

    // ----------------------------------------------------
    // 4. /api/websites/crawl
    // ----------------------------------------------------
    await runTest("4.1 POST /api/websites/crawl without client auth returns 401 CLIENT_AUTH_REQUIRED", async () => {
      const res = await fetch(`${baseUrl}/api/websites/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://curiousrabit.online" }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "CLIENT_AUTH_REQUIRED", "Expected code CLIENT_AUTH_REQUIRED");
    });

    await runTest("4.2 POST /api/websites/crawl with invalid URL returns 400 INVALID_URL", async () => {
      const loginRes = await AccountAuthService.loginClient("dev_client", "CR-demo-access-token");
      const res = await fetch(`${baseUrl}/api/websites/crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginRes.token}`,
        },
        body: JSON.stringify({ url: "invalid-url-format" }),
      });
      // Either 400 INVALID_URL or 400 FORBIDDEN_HOST
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(
        ["INVALID_URL", "FORBIDDEN_HOST"].includes(body.error.code),
        `Expected INVALID_URL or FORBIDDEN_HOST, got ${body.error.code}`
      );
    });

    await runTest("4.3 POST /api/websites/crawl blocks SSRF to localhost / 127.0.0.1 with 400 FORBIDDEN_HOST", async () => {
      const loginRes = await AccountAuthService.loginClient("dev_client", "CR-demo-access-token");
      const ssrfUrls = ["http://localhost:3000", "http://127.0.0.1:8080", "http://169.254.169.254/latest/meta-data"];

      for (const target of ssrfUrls) {
        const res = await fetch(`${baseUrl}/api/websites/crawl`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${loginRes.token}`,
          },
          body: JSON.stringify({ url: target }),
        });
        assert(res.status === 400, `Expected 400 for SSRF target ${target}, got ${res.status}`);
        const body = (await res.json()) as { error: { code: string } };
        assert(body.error.code === "FORBIDDEN_HOST", `Expected FORBIDDEN_HOST, got ${body.error.code}`);
      }
    });

    await runTest("4.4 POST /api/websites/crawl blocks non-HTTP/HTTPS protocols with 400 INVALID_PROTOCOL", async () => {
      const loginRes = await AccountAuthService.loginClient("dev_client", "CR-demo-access-token");
      const res = await fetch(`${baseUrl}/api/websites/crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginRes.token}`,
        },
        body: JSON.stringify({ url: "ftp://files.example.com" }),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_PROTOCOL", `Expected INVALID_PROTOCOL, got ${body.error.code}`);
    });

    // ----------------------------------------------------
    // 5. /api/chat/message
    // ----------------------------------------------------
    await runTest("5.1 POST /api/chat/message without session cookie/token returns 401 SESSION_REQUIRED", async () => {
      const res = await fetch(`${baseUrl}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello" }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "SESSION_REQUIRED", "Expected code SESSION_REQUIRED");
    });

    await runTest("5.2 POST /api/chat/message with invalid session token returns 401 SESSION_INVALID", async () => {
      const res = await fetch(`${baseUrl}/api/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer non-existent-session-token",
        },
        body: JSON.stringify({ message: "Hello" }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "SESSION_INVALID", "Expected code SESSION_INVALID");
    });

    // ----------------------------------------------------
    // 6. /api/widget/config
    // ----------------------------------------------------
    await runTest("6.1 GET /api/widget/config without publicId returns 400 INVALID_PUBLIC_ID", async () => {
      const res = await fetch(`${baseUrl}/api/widget/config`);
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_PUBLIC_ID", `Expected INVALID_PUBLIC_ID, got ${body.error.code}`);
    });

    await runTest("6.2 GET /api/widget/:publicId/config with unknown widget returns 404 WIDGET_NOT_FOUND", async () => {
      const res = await fetch(`${baseUrl}/api/widget/non-existent-widget-xyz/config`);
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "WIDGET_NOT_FOUND", `Expected WIDGET_NOT_FOUND, got ${body.error.code}`);
    });

    // ----------------------------------------------------
    // 7. Error Resilience & Schema Validation
    // ----------------------------------------------------
    await runTest("7.1 Malformed JSON body returns HTTP 400 INVALID_JSON (never 500 crash)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ 'malformed_json_unquoted_key': ",
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_JSON", `Expected INVALID_JSON, got ${body.error.code}`);
    });

    await runTest("7.2 Non-existent endpoint returns HTTP 404 ROUTE_NOT_FOUND", async () => {
      const res = await fetch(`${baseUrl}/api/non-existent-route`);
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "ROUTE_NOT_FOUND", `Expected ROUTE_NOT_FOUND, got ${body.error.code}`);
    });
  } finally {
    await close();
  }

  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`ENDPOINT VALIDATION SUMMARY: ${passedCount} / ${results.length} PASSED`);
  console.log("=======================================================\n");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runEndpointValidationSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
