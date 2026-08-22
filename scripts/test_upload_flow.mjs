import { chromium } from "playwright-core";

const baseUrl = "https://3000-ix6kl5l09rs38cqde9wfw-5d2b41bf.sg1.manus.computer";
const uploadFile = "/home/ubuntu/mars_cv/input/curiosity_image_01.png";
const isMobile = process.env.MOBILE === "1";

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: isMobile ? { width: 375, height: 812 } : { width: 1280, height: 900 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles(uploadFile);
  await page.getByRole("button", { name: /Analyze terrain/i }).click();
  await page.getByRole("button", { name: /Server prediction/i }).waitFor({ timeout: 30000 });
  const status = await page.locator("body").innerText();
  const normalizedStatus = status.toLowerCase();
  const serverPredictionVisible = normalizedStatus.includes("server prediction");
  const latestResultVisible = normalizedStatus.includes("latest uploaded-image result");
  if (!serverPredictionVisible || !latestResultVisible) {
    throw new Error("Post-analysis controls were not rendered after server segmentation.");
  }
  console.log(JSON.stringify({
    uploadFlow: "passed",
    viewport: isMobile ? "mobile" : "desktop",
    serverPredictionVisible,
    latestResultVisible,
  }));
} finally {
  await browser.close();
}
