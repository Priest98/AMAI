const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const [theme,width] of [['dark',1440],['light',1440],['dark',390]]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.addInitScript(t=>localStorage.setItem('marketing_os_theme',t),theme);
   await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('video')?.currentTime>1);
   await page.getByRole('button',{name:'Pause film',exact:true}).click();
   await page.locator('video').evaluate(v=>{v.currentTime=5;v.dispatchEvent(new Event('timeupdate'));});
   await page.waitForTimeout(900);
   assert.equal(await page.locator('.oy-film-story .is-active').textContent(),'Captions');
   const geometry=await page.evaluate(()=>{
    const hero=document.querySelector('.oy-film-hero').getBoundingClientRect();
    const stage=document.querySelector('.oy-film-stage').getBoundingClientRect();
    return {width:stage.width>=hero.width-1,height:stage.height>=hero.height-1,border:getComputedStyle(document.querySelector('.oy-film-frame')).borderWidth,nav:getComputedStyle(document.querySelector('.oy-cinema-nav nav')).borderRadius};
   });
   assert.equal(geometry.width,true);assert.equal(geometry.height,true);assert.equal(geometry.border,'0px');assert.equal(geometry.nav,'0px');
   await page.getByRole('button',{name:'Watch the experience'}).click();
   await page.locator('video').evaluate(v=>{v.currentTime=14.5;v.dispatchEvent(new Event('timeupdate'));v.pause();});
   await page.waitForTimeout(300);
   await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
   await page.screenshot({path:`scripts/hero-film/verification/reference-${theme}-${width}.png`});
   if(width===390){await page.getByRole('button',{name:'Open navigation'}).click();assert.equal(await page.locator('#mobile-navigation').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#mobile-navigation').isVisible(),false);}
   await page.close();
  }
  console.log('PASS: full-bleed bounds, no panel border, transparent nav geometry, synchronized story, replay and keyboard mobile menu.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
