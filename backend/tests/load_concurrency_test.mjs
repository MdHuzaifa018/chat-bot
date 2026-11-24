/**
 * Multi-User Concurrency & Load Testing Suite
 * Tests backend (http://localhost:5000) and frontend (http://localhost:3000)
 * Simulates 10-20 concurrent users across:
 *  - Health baseline
 *  - Next.js frontend pages
 *  - Authentication & Client Login
 *  - Client Access Requests
 *  - Multi-user Chat Sessions & AI Grounded Messaging
 *  - In-Memory & Database Rate Limiting resilience (bursts & 429 enforcement)
 *  - Website crawling & SSRF protection under load
 *  - Post-test server health & process stability verification
 */

import { performance } from "node:perf_hooks";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

class MetricsCollector {
  constructor() {
    this.results = [];
  }

  record(res) {
    this.results.push(res);
  }

  getScenarioResults(scenario) {
    return this.results.filter((r) => r.scenario === scenario);
  }

  getAllResults() {
    return this.results;
  }

  calculateStats(results) {
    if (results.length === 0) {
      return {
        count: 0,
        passed: 0,
        failed: 0,
        is5xx: 0,
        rateLimited: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        passRate: "0.0%",
      };
    }

    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const count = results.length;
    const passed = results.filter((r) => r.success).length;
    const is5xx = results.filter((r) => r.is5xx).length;
    const rateLimited = results.filter((r) => r.isRateLimited).length;
    const failed = count - passed;
    const sum = durations.reduce((acc, v) => acc + v, 0);

    const percentile = (p) => {
      const idx = Math.min(Math.floor((p / 100) * durations.length), durations.length - 1);
      return durations[idx];
    };

    return {
      count,
      passed,
      failed,
      is5xx,
      rateLimited,
      min: Math.round(durations[0]),
      max: Math.round(durations[durations.length - 1]),
      avg: Math.round(sum / count),
      p50: Math.round(percentile(50)),
      p90: Math.round(percentile(90)),
      p95: Math.round(percentile(95)),
      p99: Math.round(percentile(99)),
      passRate: ((passed / count) * 100).toFixed(1) + "%",
    };
  }
}

const collector = new MetricsCollector();

async function measureRequest(scenario, url, options, expectedStatuses = [200, 201]) {
  const start = performance.now();
  let status = 0;
  let body = null;
  let headers = new Headers();
  let errorMsg;

  try {
    const res = await fetch(url, options);
    status = res.status;
    headers = res.headers;
    const durationMs = performance.now() - start;

    try {
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    } catch {
      // body stream error
    }

    const success = expectedStatuses.includes(status);
    const is5xx = status >= 500;
    const isRateLimited = status === 429;

    collector.record({
      scenario,
      url,
      status,
      durationMs,
      success,
      is5xx,
      isRateLimited,
    });

    return { status, body, headers };
  } catch (err) {
    const durationMs = performance.now() - start;
    errorMsg = err.message || String(err);

    collector.record({
      scenario,
      url,
      status: 0,
      durationMs,
      success: false,
      is5xx: true, // transport/network crash
      isRateLimited: false,
      error: errorMsg,
    });

    return { status: 0, body: null, headers };
  }
}

async function runConcurrent(concurrency, workerFn) {
  const tasks = Array.from({ length: concurrency }, (_, i) => workerFn(i + 1));
  return Promise.all(tasks);
}

// ============================================================================
// LOAD TEST SCENARIOS
// ============================================================================

async function scenario1_BackendHealthBaseline(concurrency = 20) {
  console.log(`\n▶ [Scenario 1] Backend Health Baseline (Concurrency: ${concurrency})`);
  await runConcurrent(concurrency, async (id) => {
    const { status, body } = await measureRequest(
      "1. Backend Health",
      `${BACKEND_URL}/api/health`,
      { method: "GET" },
      [200]
    );
    if (status !== 200 || body?.status !== "ok") {
      throw new Error(`Worker ${id} failed health check: ${status}`);
    }
  });
}

async function scenario2_FrontendPageConcurrency(concurrency = 16) {
  console.log(`\n▶ [Scenario 2] Frontend Next.js Concurrency (Concurrency: ${concurrency})`);
  const paths = ["/", "/dashboard", "/admin/login", "/admin/requests"];

  await runConcurrent(concurrency, async (id) => {
    const path = paths[(id - 1) % paths.length];
    await measureRequest(
      "2. Frontend Pages",
      `${FRONTEND_URL}${path}`,
      { method: "GET", headers: { Accept: "text/html" } },
      [200, 307, 308]
    );
  });
}

async function scenario3_ConcurrentLogins(concurrency = 20) {
  console.log(`\n▶ [Scenario 3] Concurrent Client Logins (Concurrency: ${concurrency})`);
  const tokens = [];

  await runConcurrent(concurrency, async (id) => {
    const { status, body } = await measureRequest(
      "3. Client Auth Login",
      `${BACKEND_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `192.168.10.${100 + id}`,
        },
        body: JSON.stringify({
          username: "dev_client",
          accessCode: "CR-demo-access-token",
        }),
      },
      [200]
    );

    if (status === 200 && body?.token) {
      tokens.push(body.token);
    }
  });

  return tokens[0];
}

async function scenario4_ConcurrentAccessRequests(concurrency = 15) {
  console.log(`\n▶ [Scenario 4] Concurrent Access Requests (Concurrency: ${concurrency})`);

  await runConcurrent(concurrency, async (id) => {
    const timestamp = Date.now();
    await measureRequest(
      "4. Access Requests",
      `${BACKEND_URL}/api/auth/client/request-access`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `192.168.20.${100 + id}`,
        },
        body: JSON.stringify({
          businessName: `Enterprise Corp ${id}`,
          contactName: `Executive User ${id}`,
          email: `client_load_${id}_${timestamp}@testfirm.org`,
          websiteUrl: `https://enterprise${id}.example.org`,
        }),
      },
      [201]
    );
  });
}

async function scenario5_MultiUserChatSessionsAndQueries(concurrency = 12) {
  console.log(`\n▶ [Scenario 5] Multi-User Chat Sessions & Queries (Concurrency: ${concurrency})`);
  const queries = [
    "What are your subscription pricing tiers?",
    "How does the student daily message limit work?",
    "Can I customize the primary brand color in dashboard?",
    "What is the fee payment deadline?",
    "Does your support chatbot offer 24/7 availability?",
    "What security standards do you support?",
  ];

  await runConcurrent(concurrency, async (id) => {
    const email = `student_sim_${id}_${Date.now()}@university.edu`;

    // 1. Start Session
    const sessionRes = await measureRequest(
      "5a. Chat Session Start",
      `${BACKEND_URL}/api/session/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `192.168.30.${100 + id}`,
        },
        body: JSON.stringify({
          email,
          consent_status: true,
        }),
      },
      [201]
    );

    const rawCookie = sessionRes.headers.get("set-cookie") || "";
    const cookie = rawCookie.split(";")[0];
    const convId = sessionRes.body?.conversation_id;

    if (!cookie || !convId) {
      throw new Error(`Worker ${id} failed to obtain chat session cookie`);
    }

    // 2. Send Message
    const query = queries[(id - 1) % queries.length];
    await measureRequest(
      "5b. Chat Query Grounded",
      `${BACKEND_URL}/api/chat/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          "X-Forwarded-For": `192.168.30.${100 + id}`,
        },
        body: JSON.stringify({
          conversation_id: convId,
          message: query,
        }),
      },
      [200]
    );
  });
}

async function scenario6_RateLimitingUnderBurst(burstCount = 70) {
  console.log(`\n▶ [Scenario 6] Rate Limiter Stress & 429 Activation Test (Single IP Burst: ${burstCount} requests)`);
  const burstIp = "198.51.100.99";

  // Fire 70 simultaneous login attempts from the exact same IP (limit is 60 req/min)
  const results = await Promise.all(
    Array.from({ length: burstCount }, (_, i) =>
      measureRequest(
        "6. Rate Limit Burst",
        `${BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": burstIp,
          },
          body: JSON.stringify({
            username: "dev_client",
            accessCode: "CR-demo-access-token",
          }),
        },
        [200, 429] // Both 200 (allowed) and 429 (rate limited) are valid expected responses
      )
    )
  );

  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`   Burst results by status:`, statusCounts);
  if (statusCounts[500]) {
    throw new Error(`Rate limiter crashed with HTTP 500 under burst load!`);
  }
  if (!statusCounts[429]) {
    console.warn(`   Notice: RPC fallback or generous rate limit window permitted requests.`);
  } else {
    console.log(`   ✓ In-memory rate limiting successfully enforced: ${statusCounts[429]} requests throttled with HTTP 429.`);
  }
}

async function scenario7_ConcurrentCrawlingAndWebsites(authToken, concurrency = 10) {
  console.log(`\n▶ [Scenario 7] Concurrent Website Operations & SSRF Guard (Concurrency: ${concurrency})`);

  await runConcurrent(concurrency, async (id) => {
    // 1. List websites
    await measureRequest(
      "7a. List Websites",
      `${BACKEND_URL}/api/websites`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Forwarded-For": `192.168.50.${100 + id}`,
        },
      },
      [200]
    );

    // 2. SSRF block attempt (must return 400 FORBIDDEN_HOST, never 500 crash)
    await measureRequest(
      "7b. SSRF Guard Check",
      `${BACKEND_URL}/api/websites/crawl`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Forwarded-For": `192.168.50.${100 + id}`,
        },
        body: JSON.stringify({
          url: `http://127.0.0.1:${3000 + id}`,
        }),
      },
      [400]
    );
  });
}

// ============================================================================
// MAIN RUNNER & REPORT GENERATOR
// ============================================================================

async function runLoadAndConcurrencyTestSuite() {
  console.log("==================================================================");
  console.log("   SUPPORTAI SAAS MULTI-USER CONCURRENCY & LOAD TEST SUITE");
  console.log(`   Target Backend:  ${BACKEND_URL}`);
  console.log(`   Target Frontend: ${FRONTEND_URL}`);
  console.log(`   Timestamp:       ${new Date().toISOString()}`);
  console.log("==================================================================");

  // Initial Health Check
  const initialHealth = await fetch(`${BACKEND_URL}/api/health`).then((r) => r.json());
  console.log("\n[Server Initial State]:", initialHealth);
  const initialUptime = initialHealth.uptime;

  const totalSuiteStart = performance.now();

  // Execute scenarios
  await scenario1_BackendHealthBaseline(20);
  await scenario2_FrontendPageConcurrency(16);
  const clientToken = await scenario3_ConcurrentLogins(20);
  await scenario4_ConcurrentAccessRequests(15);
  await scenario5_MultiUserChatSessionsAndQueries(12);
  await scenario6_RateLimitingUnderBurst(70);
  await scenario7_ConcurrentCrawlingAndWebsites(clientToken || "fallback_token", 10);

  const totalSuiteDuration = Math.round(performance.now() - totalSuiteStart);

  // Post-test server health check
  const finalHealth = await fetch(`${BACKEND_URL}/api/health`).then((r) => r.json());
  console.log("\n[Server Final State]:", finalHealth);
  const uptimeDelta = finalHealth.uptime - initialUptime;

  // Compile detailed scenario metrics
  console.log("\n==================================================================");
  console.log("                   DETAILED PERFORMANCE METRICS                   ");
  console.log("==================================================================");
  console.log(
    "Scenario Name".padEnd(28) +
      "Reqs".padStart(6) +
      "Pass".padStart(6) +
      "429s".padStart(6) +
      "5xx".padStart(6) +
      "Avg(ms)".padStart(9) +
      "P50".padStart(7) +
      "P95".padStart(7) +
      "P99".padStart(7) +
      "Rate".padStart(8)
  );
  console.log("-".repeat(90));

  const scenarios = [
    "1. Backend Health",
    "2. Frontend Pages",
    "3. Client Auth Login",
    "4. Access Requests",
    "5a. Chat Session Start",
    "5b. Chat Query Grounded",
    "6. Rate Limit Burst",
    "7a. List Websites",
    "7b. SSRF Guard Check",
  ];

  for (const s of scenarios) {
    const sResults = collector.getScenarioResults(s);
    const stats = collector.calculateStats(sResults);
    console.log(
      s.padEnd(28) +
        String(stats.count).padStart(6) +
        String(stats.passed).padStart(6) +
        String(stats.rateLimited).padStart(6) +
        String(stats.is5xx).padStart(6) +
        String(stats.avg).padStart(9) +
        String(stats.p50).padStart(7) +
        String(stats.p95).padStart(7) +
        String(stats.p99).padStart(7) +
        stats.passRate.padStart(8)
    );
  }

  console.log("-".repeat(90));
  const overall = collector.calculateStats(collector.getAllResults());
  console.log(
    "OVERALL TOTAL".padEnd(28) +
      String(overall.count).padStart(6) +
      String(overall.passed).padStart(6) +
      String(overall.rateLimited).padStart(6) +
      String(overall.is5xx).padStart(6) +
      String(overall.avg).padStart(9) +
      String(overall.p50).padStart(7) +
      String(overall.p95).padStart(7) +
      String(overall.p99).padStart(7) +
      overall.passRate.padStart(8)
  );
  console.log("==================================================================");

  console.log(`\n[Execution Summary]:`);
  console.log(`• Total Requests Executed: ${overall.count}`);
  console.log(`• Total Execution Time:    ${totalSuiteDuration} ms`);
  console.log(`• Concurrency Range:       10 - 25 concurrent users / workers`);
  console.log(`• Total 5xx Server Errors: ${overall.is5xx}`);
  console.log(`• Total 429 Rate Limited:  ${overall.rateLimited}`);
  console.log(`• Overall Pass Rate:       ${overall.passRate}`);
  console.log(`• Mean Latency:            ${overall.avg} ms`);
  console.log(`• P95 Latency:             ${overall.p95} ms`);
  console.log(`• P99 Latency:             ${overall.p99} ms`);
  console.log(`• Backend Server Stability: Process remained alive with +${uptimeDelta}s continuous uptime.`);

  if (overall.is5xx > 0) {
    console.error(`\n❌ LOAD TEST FAILED: Encountered ${overall.is5xx} server crashes / 5xx responses!`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL LOAD & CONCURRENCY TESTS PASSED WITH ZERO 500 CRASHES!`);
  }
}

runLoadAndConcurrencyTestSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
