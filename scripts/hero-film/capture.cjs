// Captures actual application pages with synthetic, browser-only responses.
// Every API request is intercepted: no credentials, database or publishing.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve('apps/web/public/hero-film/captures');
fs.mkdirSync(out, { recursive: true });
const now = new Date();
const user = { id:'film-demo', name:'Oyinca Studio', email:'demo@example.invalid', brandId:'film-demo', onboardingCompleted:true, expiresAt:'2099-01-01' };
const posts = Array.from({length:3}, (_, i) => ({ id:`demo-${i}`, caption:['A little look at how the work comes together. Made with care, shared with you.','One idea. A new perspective.','The details make the difference.'][i], hashtags:['BehindTheScenes','CreativeProcess'], status:'SCHEDULED', createdAt:now.toISOString(), scheduledAt:new Date(now.getTime()+(i+1)*86400000).toISOString(), targets:[{platform:'TIKTOK',status:'PENDING'}], media:[] }));
function fixture(url) {
  if(url.includes('/organization')) return {id:'demo-org',clients:[],brands:[]};
  if(url.includes('/portfolio')) return {clients:[]};
  if(url.includes('/auth/me')) return user;
  if(url.includes('/posts/stats')) return {needsApprovalCount:0,scheduledCount:3,publishedCount:0};
  if(url.includes('/posts?')) return url.includes('NEEDS_APPROVAL') ? [{...posts[0],status:'NEEDS_APPROVAL'}] : url.includes('SCHEDULED') ? posts : [];
  if(url.includes('/engine/activity')) return ['MEDIA_UPLOADED','CAPTION_GENERATED','AUTO_SCHEDULED'].map((type,i)=>({id:String(i),type,createdAt:now.toISOString(),message:['Studio content added','Caption prepared for review','Approved content scheduled'][i]}));
  if(url.includes('/engine/calendar-insights')) return {totalScheduled:0};
  if(url.includes('/engine/state')) return {timeZone:'UTC',postsPerDay:1,state:'ACTIVE'};
  if(url.includes('/oauth/accounts')) return {socialAccounts:[],googleDrive:null};
  if(url.endsWith('/billing')) return {plan:'PRO',status:'ACTIVE',entitlements:{analyticsLevel:'advanced',maxBrands:1},usage:{},showProActivation:false};
  if(url.includes('/notifications')) return {notifications:[],unreadCount:0};
  return [];
}
(async()=>{
 const browser=await chromium.launch();
 try {
 for(const [format,width,height] of [['desktop',1440,950],['mobile',430,820]]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(user=>{localStorage.setItem('amai_user',JSON.stringify(user));localStorage.setItem('marketing_os_theme','dark');},user);
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')) return route.fulfill({status:200,contentType:url.pathname.endsWith('/events')?'text/event-stream':'application/json',body:url.pathname.endsWith('/events')?'data: {"type":"CONNECTED"}\n\n':JSON.stringify(fixture(url.pathname+url.search))});
   if(url.hostname!=='localhost' && url.hostname!=='127.0.0.1') return route.abort();
   return route.continue();
  });
  const page=await context.newPage(); page.on('pageerror', e=>console.log(e.message,e.stack));
  for(const [scene,route] of [['content','media'],['caption','approval-queue'],['schedule','calendar'],['posting','scheduled'],['performance','analytics']]) {
   await page.goto(`http://localhost:3000/dashboard/${route}`,{waitUntil:'domcontentloaded',timeout:120000});
   await page.locator('h1').first().waitFor({timeout:60000});
   await page.waitForTimeout(1600);
   await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
   await page.screenshot({path:path.join(out,`${format}-${scene}.png`)});
   const title=await page.locator('h1').first().textContent(); if(title.includes('Something went wrong')) throw Error('Invalid capture: '+scene); console.log(format,scene,title);
  }
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});



