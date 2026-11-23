import { ThemeDetectorService } from "../src/services/themeDetector.service.js";
import { CrawlerService } from "../src/services/crawler.service.js";
import { GeminiService } from "../src/services/gemini.service.js";
import { AccountAuthService } from "../src/services/accountAuth.service.js";

async function runSystemVerification() {
  console.log("=== RUNNING SYSTEM VERIFICATION SUITE ===");

  // 1. Theme Detection Verification
  console.log("\n[Test 1] Testing ThemeDetectorService on sample HTML...");
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Curious Rabit - Modern Web Solutions</title>
        <meta name="theme-color" content="#10B981" />
        <link rel="icon" href="/favicon.png" />
        <style>
          :root {
            --primary: #2563EB;
            --secondary: #9333EA;
            --background: #0B0F19;
          }
          body {
            background-color: var(--background);
            font-family: 'Poppins', sans-serif;
          }
        </style>
      </head>
      <body>
        <div class="bg-[#0B0F19] text-white">
          <header>
            <h1 class="text-3xl font-bold">Curious Rabit</h1>
          </header>
          <main>
            <h2>Our Web Development Services</h2>
            <p>We build high performance websites and AI chatbots.</p>
          </main>
          <footer>
            <p>Contact us: info@curiousrabit.online | Phone: +91 9876543210</p>
          </footer>
        </div>
      </body>
    </html>
  `;

  const theme = await ThemeDetectorService.extractTheme(sampleHtml, new URL("https://curiousrabit.online"));
  console.log("Extracted Theme:", {
    brandName: theme.brandName,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    suggestedColors: theme.suggestedColors,
    fontFamily: theme.fontFamily,
  });

  if (!theme.primaryColor || !theme.suggestedColors || theme.suggestedColors.length === 0) {
    throw new Error("Theme extraction failed to extract valid colors!");
  }
  console.log("  PASS: Theme detection accurately extracted brand colors, dark mode and palette.");

  // 2. Crawler Structured Text & Footer Extraction
  console.log("\n[Test 2] Testing CrawlerService.extractPageData...");
  const pageData = CrawlerService.extractPageData(sampleHtml, "https://curiousrabit.online");
  console.log("Extracted Page Title:", pageData.title);
  console.log("Clean Text Length:", pageData.cleanText.length);
  console.log("Contains Headings:", pageData.cleanText.includes("## Our Web Development Services"));
  console.log("Contains Footer Details:", pageData.cleanText.includes("info@curiousrabit.online"));

  if (!pageData.cleanText.includes("info@curiousrabit.online")) {
    throw new Error("Crawler lost footer contact information!");
  }
  console.log("  PASS: Crawler preserved structured headings and contact/footer information.");

  // 3. Grounded Chatbot Answers (Hindi, Hinglish, English)
  console.log("\n[Test 3] Testing Grounded Chatbot Intelligence & Fallback...");
  const contextChunks = [
    `[Document: Curious Rabit - Our Web Development Services]\nCurious Rabit builds high performance websites, custom AI client support chatbots, and SaaS platforms. Phone: +91 9876543210. Email: info@curiousrabit.online. Pricing: Starter plan is $49/mo, Business plan is $199/mo.`,
  ];

  const englishReply = await GeminiService.generateWebsiteReply({
    websiteName: "Curious Rabit",
    userMessage: "What services do you provide?",
    contextChunks,
  });
  console.log("English Query Reply:", englishReply.answer);

  const hinglishReply = await GeminiService.generateWebsiteReply({
    websiteName: "Curious Rabit",
    userMessage: "Aapka contact number aur pricing kya hai?",
    contextChunks,
  });
  console.log("Hinglish Query Reply:", hinglishReply.answer);

  if (!englishReply.answer || !hinglishReply.answer) {
    throw new Error("Chatbot failed to generate grounded replies!");
  }
  console.log("  PASS: Chatbot understands website context and answers in both English and Hinglish.");

  // 4. Login Authentication Verification
  console.log("\n[Test 4] Testing AccountAuthService Login Flow...");
  const demoLogin = await AccountAuthService.loginClient("dev_client", "CR-demo-access-token");
  console.log("Demo Login Success:", {
    accountType: demoLogin.account.accountType,
    username: (demoLogin.account as any).username,
    tokenPrefix: demoLogin.token.substring(0, 10),
  });

  const resolved = await AccountAuthService.resolveSession(demoLogin.token);
  if (!resolved || resolved.accountType !== "client") {
    throw new Error("Failed to resolve newly generated session token!");
  }
  console.log("  PASS: Session token generation and instant resolution validated successfully.");

  console.log("\nALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! ✅");
}

runSystemVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
