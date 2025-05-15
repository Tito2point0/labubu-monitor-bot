// index.js

const puppeteer = require('puppeteer');

const PRODUCT_URL = 'https://www.popmart.com/ca/products/1662/DIMOO-Weaving-Wonders-Series-Quilt-Phone-Case-Blind-Box';
const CHECK_INTERVAL = 10000; // 10 seconds

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Function to monitor product availability
  const monitorProduct = async () => {
    try {
      await page.goto(PRODUCT_URL, { waitUntil: 'networkidle2' });

      // Handle country selection prompt
      try {
        await page.waitForSelector('.country-selector', { timeout: 5000 });
        await page.click('.country-selector .us-option');
        console.log('Country set to United States.');
      } catch (e) {
        console.log('Country selector not found or already set.');
      }

      // Accept privacy banner
      try {
        await page.waitForSelector('.privacy-banner .accept-button', { timeout: 5000 });
        await page.click('.privacy-banner .accept-button');
        console.log('Privacy banner accepted.');
      } catch (e) {
        console.log('Privacy banner not found or already accepted.');
      }

      // Wait for product details to load
      await page.waitForSelector('.product-details', { timeout: 10000 });

      // Check if product is in stock
      const isInStock = await page.evaluate(() => {
        const stockElement = document.querySelector('.stock-status');
        return stockElement && stockElement.textContent.includes('In Stock');
      });

      if (isInStock) {
        console.log('Product is in stock. Attempting to add to cart.');

        // Click 'Add to Cart' button
        await page.click('.add-to-cart-button');

        // Wait for confirmation
        await page.waitForSelector('.cart-confirmation', { timeout: 5000 });
        console.log('Product added to cart successfully.');
      } else {
        console.log('Product is still out of stock.');
      }
    } catch (error) {
      console.error('Error during monitoring:', error);
    }
  };

  // Initial check
  await monitorProduct();

  // Set interval for continuous monitoring
  setInterval(async () => {
    await monitorProduct();
  }, CHECK_INTERVAL);
})();
