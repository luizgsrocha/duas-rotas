import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const file =
    path === "/api/cities"
      ? "cities.json"
      : path === "/"
        ? "index.html"
        : path.slice(1);
  try {
    const data = await readFile(new URL(file, root));
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".json")
            ? "application/json"
            : file.endsWith(".png")
              ? "image/png"
              : "text/html",
    );
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [360, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await page.locator(".featured-route").count(), 3);
    await page.locator(".featured-routes-disclosure summary").click();
    assert.ok(
      await page.locator(".featured-routes-disclosure").evaluate(
        (element) => element.open,
      ),
    );
    assert.equal(
      await page
        .locator(".featured-routes")
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(" ").length,
        ),
      width === 360 ? 1 : 3,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator(".featured-route").first().click();
    await page.waitForFunction(
      () => document.querySelector("#origin").dataset.slug === "taubate",
    );
    assert.equal(
      await page.locator("#destination").getAttribute("data-slug"),
      "campinas",
    );
    assert.equal(await page.locator("#results").textContent(), "");
    await page.goto(
      `http://127.0.0.1:${server.address().port}/caronas/formosa-para-brasilia.html`,
    );
    assert.equal(
      await page.locator("h1").textContent(),
      "Caronas de Formosa (GO) para Brasília (DF)",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator(".seo-cta").click();
    await page.waitForFunction(
      () => document.querySelector("#origin").dataset.slug === "formosa",
    );
    assert.equal(
      await page.locator("#destination").getAttribute("data-slug"),
      "brasilia",
    );
    assert.equal(await page.locator("#results").textContent(), "");
    await page.locator('footer a[href="/versoes.html"]').click();
    assert.equal(
      await page.locator("h1").textContent(),
      "Histórico de versões",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "SEO UI: direct featured-route prefill, route CTA, no automatic search and version history passed.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
