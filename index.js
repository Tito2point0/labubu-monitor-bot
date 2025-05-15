// index.js
require('dotenv').config();
const puppeteer = require('puppeteer');
const knex = require('knex');
const fs = require('fs');
const path = require('path');

// Initialize Knex with SQLite3
const db = knex({
  client: 'sqlite3',
  connection: { filename: './dev.sqlite3' },
  useNullAsDefault: true
});

(async () => {
  const exists = await db.schema.hasTable('stock_logs');
  if (!exists) {
    await db.schema.createTable('stock_logs', table => {
      table.increments('id').primary();
      table.string('status');
      table.text('message');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('✅ Created "stock_logs" table.');
  }
})();

const productUrl = process.env.PRODUCT_URL;
const interval = parseInt(process.env.CHECK_INTERVAL || '5000');

if (!productUrl) {
  console.error("❌ PRODUCT_URL is not set in .env");
  process.exit(1);
}

console.log(`🔎 Monitoring ${productUrl} every ${interval / 1000}s...`);

async function checkStock() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  page.on('requestfailed', request => {
    console.error(`❌ Request failed: ${request.url()} -> ${request.failure().errorText}`);
  });

  page.on('console', msg => {
    console.log(`📦 Console:`, msg.text());
  });

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    console.log("🌐 Navigating to product page...");
    const response = await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`📡 Status Code: ${response.status()}`);

    // Handle location popup
    try {
      await page.waitForSelector('.modal-content button', { timeout: 5000 });
      const locationButtons = await page.$$eval('.modal-content button', buttons =>
        buttons.map(b => b.innerText.trim().toLowerCase())
      );

      if (locationButtons.includes('united states')) {
        const buttonHandles = await page.$$('.modal-content button');
        const usIndex = locationButtons.indexOf('united states');
        await buttonHandles[usIndex].click();
        console.log("🌍 Selected location: United States");
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      }
    } catch (err) {
      console.log("🌍 No location selector appeared or was already dismissed.");
    }

    // Accept privacy terms
    try {
      const acceptBtn = await page.$x("//button[contains(., 'ACCEPT')]");
      if (acceptBtn.length > 0) {
        await acceptBtn[0].click();
        console.log("✅ Accepted Privacy Terms");
        await page.waitForTimeout(500);
      }
    } catch (err) {
      console.log("✅ Privacy banner not shown or already accepted.");
    }

    await page.waitForSelector('body', { timeout: 15000 });

    const buttonTexts = await page.$$eval('button', buttons =>
      buttons.map(btn => btn.innerText.trim().toLowerCase())
    );
    console.log("🧾 Found buttons:", buttonTexts);

    const inStock = buttonTexts.some(text => text.includes('add to bag'));

    let price = 'N/A';
    try {
      price = await page.$eval('.product-price', el => el.innerText.trim());
    } catch (e) {
      console.warn("⚠️ Could not extract price:", e.message);
    }

    const status = inStock ? 'in_stock' : 'sold_out';
    const message = inStock ? 'LABUBU in stock!' : 'LABUBU still sold out';

    console.log(inStock ? "🚨 LABUBU IN STOCK! GO GO GO!" : "❌ Still sold out");
    console.log(`💰 Price: ${price}`);

    await db('stock_logs').insert({ status, message });

  } catch (err) {
    console.error("❌ Error during checkStock:", err.message);

    if (!page.isClosed()) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(__dirname, `error_screenshot_${timestamp}.png`);
        const htmlPath = path.join(__dirname, `error_page_${timestamp}.html`);

        await page.screenshot({ path: screenshotPath, fullPage: true });
        const html = await page.content();
        fs.writeFileSync(htmlPath, html);

        console.log(`🖼️ Saved screenshot: ${screenshotPath}`);
        console.log(`📝 Saved HTML: ${htmlPath}`);
      } catch (screenshotErr) {
        console.error("❌ Screenshot failed:", screenshotErr.message);
      }
    }

    await db('stock_logs').insert({ status: 'error', message: err.message });
  } finally {
    await browser.close();
    console.log("🧼 Browser session closed.");
  }
}

setInterval(checkStock, interval);