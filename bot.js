const puppeteer = require('puppeteer');
require('dotenv').config();

const productUrl = process.env.PRODUCT_URL;

async function buyLabubu() {
  const browser = await puppeteer.launch({ headless: false }); // set to false to see browser
  const page = await browser.newPage();

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

    // Simulate "Add to Cart" (you may need to tweak selector)
    await page.waitForSelector('button.add-to-cart'); // Example selector
    await page.click('button.add-to-cart');

    console.log("🛒 Added to cart!");

    // Wait for cart modal or redirect
    await page.waitForTimeout(3000); // Give time for cart update

    // Go to cart page
    await page.goto('https://www.popmart.com/cart', { waitUntil: 'domcontentloaded' });
    console.log("🚀 Navigated to cart!");

    // Optional: pause to let you finish checkout manually
    await page.waitForTimeout(60000); // 60s pause
  } catch (err) {
    console.error("❌ Bot failed:", err.message);
  } finally {
    // await browser.close(); // optional close
  }
}

module.exports = buyLabubu;
