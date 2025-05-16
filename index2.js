// index.js - Full Automation Bot
const puppeteer = require('puppeteer');
const CHECK_INTERVAL = 10000;
const PRODUCT_URL = 'https://www.popmart.com/ca/products/1662/DIMOO-Weaving-Wonders-Series-Quilt-Phone-Case-Blind-Box';

async function checkAndAddToCart() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log(`🔎 Monitoring ${PRODUCT_URL} every ${CHECK_INTERVAL / 1000}s...`);
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });

    // 1. Click "United States"
    try {
      await page.waitForSelector('button', { timeout: 5000 });
      const countryButtons = await page.$$('button');
      for (const btn of countryButtons) {
        const text = await btn.evaluate(el => el.textContent.trim());
        if (text === 'United States') {
          console.log('🌍 Selecting United States...');
          await btn.click();
          await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
          break;
        }
      }
    } catch (e) {
      console.log('🌎 No country selector found.');
    }

    // 2. Click Accept Terms
    try {
      const acceptBtn = await page.$x("//button[contains(., 'ACCEPT')]");
      if (acceptBtn.length > 0) {
        console.log('✅ Accepting terms...');
        await acceptBtn[0].click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('✅ Terms already accepted.');
    }

    // 3. Wait for main product buttons
    await page.waitForSelector('button', { timeout: 10000 });

    const buttons = await page.$$eval('button', els =>
      els.map(el => el.textContent.trim().toLowerCase())
    );

    const addToBag = buttons.find(txt => txt.includes('add to bag'));

    if (addToBag) {
      console.log('🚨 Product IN STOCK! Attempting to add to bag...');
      const matchingBtn = (await page.$$('button')).find(async el => {
        const text = await el.evaluate(elm => elm.textContent.toLowerCase());
        return text.includes('add to bag');
      });
      if (matchingBtn) {
        await matchingBtn.click();
        console.log('🛒 Clicked add to bag.');
      }
    } else {
      console.log('❌ Still sold out.');
    }

  } catch (err) {
    console.error('❌ Error during check:', err.message);
  } finally {
    await browser.close();
    console.log('🧼 Closed browser session.');
    setTimeout(checkAndAddToCart, CHECK_INTERVAL);
  }
}

checkAndAddToCart();
