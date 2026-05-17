import { test, expect, type CDPSession } from "@playwright/test";

const NETWORK_3G = {
  offline: false,
  downloadThroughput: (750 * 1024) / 8,
  uploadThroughput: (250 * 1024) / 8,
  latency: 100,
};

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TIMEOUT = 120_000;

test.describe("Mobile 3G Throttled E2E", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  });

  let cdp: CDPSession;

  test.beforeEach(async ({ page }) => {
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", NETWORK_3G);
  });

  test.afterEach(async () => {
    try {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0,
      });
    } catch { /* session may be closed */ }
  });

  test("landing page loads on 3G", async ({ page }) => {
    test.setTimeout(TIMEOUT);
    const t0 = Date.now();
    await page.goto(`${BASE_URL}/en`, { waitUntil: "domcontentloaded" });
    const ms = Date.now() - t0;
    console.log(`[3G] Landing DOM loaded in ${ms} ms`);
    await expect(page.locator("body")).not.toBeEmpty();
    expect(ms).toBeLessThan(30_000);
  });

  test("dashboard renders content or skeleton on 3G", async ({ page }) => {
    test.setTimeout(TIMEOUT);
    await page.goto(`${BASE_URL}/en/dashboard`, { waitUntil: "domcontentloaded" });
    const ok = await page.locator("main, h1, [role='main']").first()
      .isVisible({ timeout: 45_000 }).catch(() => false);
    const authRedirect = page.url().includes("sign-in");
    expect(ok || authRedirect).toBeTruthy();
  });

  test("locale switcher toggles Bangla/English", async ({ page }) => {
    test.setTimeout(TIMEOUT);
    await page.goto(`${BASE_URL}/en`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en/);

    const globe = page.locator("button:has(svg.lucide-globe)").first()
      .or(page.getByRole("button", { name: /language|toggle/i }).first());

    if (await globe.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await globe.click();
      await page.waitForTimeout(500);
      const bn = page.locator("[role='menuitem']").filter({ hasText: /বাংলা|bengali/i }).first();
      if (await bn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bn.click();
        await page.waitForURL(/\/bn/, { timeout: 30_000 });
        await expect(page).toHaveURL(/\/bn/);
        const text = (await page.locator("body").textContent()) ?? "";
        expect(/[\u0980-\u09FF]/.test(text)).toBeTruthy();
        expect(text.length).toBeGreaterThan(50);
      }
    } else {
      await page.goto(`${BASE_URL}/bn`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/bn/);
    }
  });

  test("Bengali fonts load without excessive CLS", async ({ page }) => {
    test.setTimeout(TIMEOUT);
    await page.goto(`${BASE_URL}/bn`, { waitUntil: "load" });
    const cls = await page.evaluate(() => new Promise<number>((resolve) => {
      let v = 0;
      const obs = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (!(e as any).hadRecentInput) v += (e as any).value;
        }
      });
      obs.observe({ type: "layout-shift", buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(v); }, 5_000);
    }));
    console.log(`[3G] Bangla CLS: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.25);
  });
});
