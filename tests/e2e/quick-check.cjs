const { chromium } = require('@playwright/test');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.goto('http://localhost:3000', {timeout:90000});
 await page.getByRole('heading',{level:1}).waitFor();
 await page.screenshot({path:'tests/e2e/landing-desktop.png',fullPage:true});
 console.log(JSON.stringify({title:await page.title(),heading:await page.locator('h1').innerText(),errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
