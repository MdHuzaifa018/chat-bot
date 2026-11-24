import http from "node:http";
import { app } from "../src/app.js";
import { AccountAuthService } from "../src/services/accountAuth.service.js";

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

async function runProfileSuite() {
  console.log("\n=======================================================");
  console.log("RUNNING PROFILE ENDPOINTS VERIFICATION SUITE");
  console.log("Testing: GET /api/auth/profile, PUT /api/auth/profile");
  console.log("=======================================================\n");

  const { baseUrl, close } = await startServer();

  try {
    // 1. Unauthorized GET /api/auth/profile
    await runTest("1. GET /api/auth/profile without authentication returns HTTP 401", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`);
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "UNAUTHORIZED", `Expected UNAUTHORIZED, got ${body.error.code}`);
    });

    // 2. Client Login & GET /api/auth/profile
    let clientToken = "";
    await runTest("2.1 Client login obtains session token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "dev_client", accessCode: "CR-demo-access-token" }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { token: string };
      clientToken = body.token;
      assert(Boolean(clientToken), "Expected valid client token");
    });

    await runTest("2.2 GET /api/auth/profile with Bearer token returns client profile", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as {
        authenticated: boolean;
        data: { accountType: string; email: string; businessName: string; username: string };
      };
      assert(body.authenticated === true, "Expected authenticated: true");
      assert(body.data.accountType === "client", `Expected client, got ${body.data.accountType}`);
      assert(Boolean(body.data.email), "Expected client email");
      assert(Boolean(body.data.businessName), "Expected client businessName");
      assert(body.data.username === "dev_client", `Expected username dev_client, got ${body.data.username}`);
    });

    // 3. Client PUT /api/auth/profile
    await runTest("3.1 PUT /api/auth/profile updates client name and businessName", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          name: "Acme Global Solutions",
          businessName: "Acme Global Solutions Inc",
        }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as {
        success: boolean;
        data: { name: string; businessName: string };
      };
      assert(body.success === true, "Expected success: true");
      assert(body.data.businessName === "Acme Global Solutions Inc", `Got ${body.data.businessName}`);
    });

    await runTest("3.2 PUT /api/auth/profile with invalid email returns 400 INVALID_EMAIL", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({ email: "invalid-email-format" }),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_EMAIL", `Expected INVALID_EMAIL, got ${body.error.code}`);
    });

    await runTest("3.3 PUT /api/auth/profile with too short access code returns 400 INVALID_ACCESS_CODE", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({ newAccessCode: "short" }),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_ACCESS_CODE", `Expected INVALID_ACCESS_CODE, got ${body.error.code}`);
    });

    await runTest("3.4 PUT /api/auth/profile with wrong current access code returns 401", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          currentAccessCode: "CR-wrong-current-code",
          newAccessCode: "CR-brand-new-access-token-999",
        }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_CURRENT_ACCESS_CODE", `Expected INVALID_CURRENT_ACCESS_CODE, got ${body.error.code}`);
    });

    await runTest("3.5 PUT /api/auth/profile with valid current & new access code succeeds", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          currentAccessCode: "CR-demo-access-token",
          newAccessCode: "CR-updated-access-token-1234",
        }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { success: boolean; data: { accountType: string } };
      assert(body.success === true, "Expected success: true");
    });

    await runTest("3.6 PUT /api/auth/profile with empty body returns 400 NO_UPDATES", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({}),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "NO_UPDATES", `Expected NO_UPDATES, got ${body.error.code}`);
    });

    // 4. Admin Login & GET /api/auth/profile
    let adminToken = "";
    await runTest("4.1 Admin login obtains session token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@curiousrabit.online", password: "password123" }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { token: string };
      adminToken = body.token;
      assert(Boolean(adminToken), "Expected valid admin token");
    });

    await runTest("4.2 GET /api/auth/profile returns admin profile with role and permissions", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as {
        authenticated: boolean;
        data: { accountType: string; email: string; role: string; permissions: Record<string, boolean> };
      };
      assert(body.authenticated === true, "Expected authenticated: true");
      assert(body.data.accountType === "admin", `Expected admin, got ${body.data.accountType}`);
      assert(body.data.role === "super_admin", `Expected super_admin, got ${body.data.role}`);
      assert(body.data.permissions?.manageTeam === true, "Expected manageTeam permission");
    });

    await runTest("4.3 PUT /api/auth/profile updates admin name", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Chief Administrator" }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { success: boolean; data: { name: string } };
      assert(body.success === true, "Expected success: true");
      assert(body.data.name === "Chief Administrator", `Expected Chief Administrator, got ${body.data.name}`);
    });

    await runTest("4.4 PUT /api/auth/profile with wrong current admin password returns 401", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword: "wrongpassword123",
          newPassword: "NewSuperPassword@2026",
        }),
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      const body = (await res.json()) as { error: { code: string } };
      assert(body.error.code === "INVALID_CURRENT_PASSWORD", `Expected INVALID_CURRENT_PASSWORD, got ${body.error.code}`);
    });

    await runTest("4.5 PUT /api/auth/profile with valid current and new password succeeds", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword: "password123",
          newPassword: "NewSecurePassword@2026",
        }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { success: boolean; data: { accountType: string } };
      assert(body.success === true, "Expected success: true");
    });

    // 5. Update package.json endpoints test or run
    await runTest("5.1 PATCH /api/auth/profile route alias also functions", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Executive Platform Admin" }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const body = (await res.json()) as { data: { name: string } };
      assert(body.data.name === "Executive Platform Admin", `Got ${body.data.name}`);
    });
  } finally {
    await close();
  }

  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`PROFILE SUITE SUMMARY: ${passedCount} / ${results.length} PASSED`);
  console.log("=======================================================\n");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runProfileSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
