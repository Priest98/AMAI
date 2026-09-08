const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch();try{
 const c=await b.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});await c.addInitScript(()=>localStorage.setItem('amai_user',JSON.stringify({id:'qa',email:'qa@example.com',name:'QA',brandId:'qa-brand',expiresAt:'2099-01-01'})));
 let fail=true,saveFails=true,writes=0;const cfg={id:'qa',brandId:'qa-brand',state:'PAUSED',approvalMode:'MANUAL',defaultTone:'Professional',postsPerDay:1,scheduleStartFrom:'TODAY',customStartDate:null,timeZone:'Africa/Lagos',schedulingPlatform:'TIKTOK'};
 await c.route('**/api/**',r=>{const req=r.request(),u=new URL(req.url());let data={},status=200;
 if(u.pathname.endsWith('/auth/me'))data={onboardingCompleted:true};
 else if(u.pathname.endsWith('/engine/approval-mode')){writes++;status=saveFails?503:200;data=saveFails?{message:'Mode save failed'}:cfg}
 else if(u.pathname.endsWith('/engine/state')){status=fail?503:200;data=fail?{message:'Unavailable'}:cfg}
 else if(u.pathname.endsWith('/engine/activity'))data=[];
 else if(u.pathname.endsWith('/billing'))data={plan:'PRO',entitlements:{autopilotLevel:'advanced'},usage:{posts:{used:0,limit:100},aiGenerations:{used:0,limit:100},storage:{used:0,limit:100}}};
 else if(u.pathname.endsWith('/posts/stats')){status=fail?503:200;data={needsApprovalCount:2,scheduledCount:3,publishedCount:4}}
 else if(u.pathname.endsWith('/posts'))data=[];
 else {status=503;data={message:'Controlled unavailable response'}}
 return r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})});
 const p=await c.newPage();await p.goto('http://localhost:3000/dashboard/engine',{timeout:120000});await expect(p.getByRole('button',{name:'Retry status'})).toBeVisible({timeout:30000});fail=false;await p.getByRole('button',{name:'Retry status'}).click();
 const auto=p.locator('button[aria-pressed]').filter({hasText:'I create, schedule'});await auto.click();const d=p.getByRole('dialog',{name:'Enable Autopilot?'});await expect(d).toBeVisible();expect(writes).toBe(0);await d.getByRole('button',{name:'Enable Autopilot',exact:true}).click();await expect(d.getByRole('status')).toContainText('Mode save failed');await expect(auto).toHaveAttribute('aria-pressed','false');
 saveFails=false;await d.getByRole('button',{name:'Enable Autopilot',exact:true}).click();await expect(d).toBeHidden();await expect(auto).toHaveAttribute('aria-pressed','true');expect(writes).toBe(2);
 fail=true;await p.goto('http://localhost:3000/dashboard/analytics',{timeout:120000});await expect(p.getByRole('button',{name:'Retry analytics'})).toBeVisible({timeout:30000});fail=false;await p.getByRole('button',{name:'Retry analytics'}).click();await expect(p.getByRole('heading',{name:'Your next step is review'})).toBeVisible();await expect(p.getByRole('link',{name:'Review posts'})).toHaveAttribute('href','/dashboard/approval-queue');
 for(const width of [1440,1280,1024,768,430,390,360]){await p.setViewportSize({width,height:900});expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)}
 await p.screenshot({path:'tests/e2e/analytics-360.png'});console.log('PASS Autopilot load retry, explicit confirmation, failed-save retention, server-confirmed mode and analytics error/retry/summary at seven widths');await c.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
