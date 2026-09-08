const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 for(const width of [1440,1280,1024,768,430,390,360]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/','/login','/register']){
   await page.goto('http://localhost:3000'+path,{timeout:90000});
   await page.locator('h1').waitFor();
   await expect(page.locator('html')).not.toHaveAttribute('data-nextjs-dialog','');
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,unnamed:[...document.querySelectorAll('button,input:not([type=checkbox])')].filter(e=>e.getBoundingClientRect().width&&!(e.getAttribute('aria-label')||e.textContent.trim()||e.labels?.length)).map(e=>e.outerHTML.slice(0,120))}));
   expect(geometry.overflow,`${path} at ${width}`).toBe(false);expect(geometry.unnamed).toEqual([]);
   if(width===1440||width===390) await page.screenshot({path:`tests/e2e/${path==='/'?'landing':path.slice(1)}-${width}.png`});
   if(path==='/'){
    if(await page.getByRole('button',{name:'Open navigation'}).isVisible()){
     await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.locator('#mobile-navigation')).toBeVisible();
     await page.keyboard.press('Escape');await expect(page.locator('#mobile-navigation')).toBeHidden();
    }
    const faq=page.locator('#faq summary').first();await faq.click();await expect(faq.locator('..')).toHaveAttribute('open','');
   } else {
    await page.getByLabel('Email address',{exact:true}).fill('qa@example.com');
    await page.getByLabel('Password',{exact:true}).fill('testpassword');
    await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(page.locator('#password')).toHaveAttribute('type','text');
    if(path==='/login'){
     await page.route('**/auth/login',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Invalid email address or password.'})}));
     await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('.oy-auth-panel [role=alert]')).toContainText('Invalid');
     await expect(page.getByLabel('Email address',{exact:true})).toHaveValue('qa@example.com');
    } else {
     await page.getByLabel('Full name').fill('QA User');await page.getByLabel('Confirm password',{exact:true}).fill('different');
     await page.locator('button[type=submit]').click();await expect(page.locator('.oy-auth-panel [role=alert]')).toContainText('Passwords do not match');
    }
   }
   results.push({width,path,...geometry});
  }
  expect(errors).toEqual([]);await context.close();
 }
 const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const p=await c.newPage();await p.goto('http://localhost:3000');await expect(p.locator('h1')).toBeVisible();expect(await p.locator('html').getAttribute('class')).not.toContain('lenis');await c.close();
 fs.writeFileSync('tests/e2e/acquisition-results.json',JSON.stringify(results,null,2));console.log(`PASS ${results.length} responsive page checks, form failures, navigation, FAQ and reduced motion`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
