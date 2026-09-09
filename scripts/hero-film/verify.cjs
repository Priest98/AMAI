const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const out='scripts/hero-film/verification';fs.mkdirSync(out,{recursive:true});
 const results=[];
 try {
  for(const theme of ['dark','light']) for(const width of [320,360,375,390,430,768,1024,1440,1920]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   await page.addInitScript(t=>localStorage.setItem('marketing_os_theme',t),theme);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('.oy-film-headline').waitFor();
   await page.waitForTimeout(300);
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,source:document.querySelector('.oy-film-frame video').getAttribute('src'),headline:document.querySelector('h1').textContent}));
   assert.equal(state.overflow,false,`${theme} ${width}: overflow`);assert.equal(state.source,null,'Reduced motion must not load video');assert.equal(errors.length,0,errors.join('\n'));
   if(width===390||width===1440)await page.screenshot({path:`${out}/${theme}-${width}.png`});
   results.push({theme,width,...state});await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('video')?.currentTime>1,{},{timeout:30000});
  await page.getByRole('button',{name:'Pause film',exact:true}).click();
  for(const [time,text] of [[4.4,'Captions.'],[6.4,'Scheduling.'],[8.4,'Posting.'],[10.4,'Performance.'],[12.4,'The rest.'],[14.5,'Oyinca manages']]) {
   await page.locator('video').evaluate((v,t)=>{v.currentTime=t;v.dispatchEvent(new Event('timeupdate'));},time);
   await page.waitForTimeout(150);
   assert.ok((await page.locator('.oy-film-headline').textContent()).includes(text));
  }
  await page.getByRole('button',{name:'Replay film',exact:true}).click();
  await page.getByRole('button',{name:'Skip intro',exact:false}).click();
  assert.ok((await page.locator('h1').textContent()).includes('Oyinca manages'));
  const paused=await page.locator('video').evaluate(v=>v.paused);assert.equal(paused,true);
  await page.close();console.log('PASS: 18 responsive/theme checks, reduced-motion no-download, all film cues, pause/replay/skip.');
  fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

