const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch();try{
 const c=await b.newContext({viewport:{width:360,height:900},reducedMotion:'reduce'});await c.addInitScript(()=>{localStorage.setItem('amai_user',JSON.stringify({id:'qa',email:'qa@example.com',name:'QA',brandId:'qa-brand',expiresAt:'2099-01-01'}));localStorage.setItem('oyinca:read-notification-ids:qa-brand','{broken')});
 let healthy=false,notifications=false;
 await c.route('**/api/**',r=>{const req=r.request(),u=new URL(req.url());let data={},status=200;
 if(u.pathname.endsWith('/auth/me'))data={onboardingCompleted:true};
 else if(u.pathname.endsWith('/engine/activity')){status=notifications?200:503;data=notifications?[{id:'qa-event',type:'APPROVAL_QUEUED',message:'Synthetic post needs review',createdAt:new Date().toISOString()}]:{message:'Unavailable'}}
 else if(u.pathname.endsWith('/engine/state')&&healthy)data={state:'PAUSED',approvalMode:'MANUAL',defaultTone:'Professional'};
 else if(u.pathname.endsWith('/business-brain')&&healthy)data={businessDescription:'Existing brand details',brandPersonality:[],contentPillars:[]};
 else if(u.pathname.endsWith('/business-brain/memory')&&healthy)data=[];
 else if(u.pathname.endsWith('/oauth/accounts')&&healthy)data={socialAccounts:[]};
 else {status=503;data={message:'Controlled unavailable response'}}
 return r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})});
 const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3000/dashboard/settings?tab=brain',{timeout:120000});await expect(p.getByRole('button',{name:'Retry settings'})).toBeVisible({timeout:30000});await expect(p.getByRole('button',{name:'Save changes',exact:true})).toHaveCount(0);
 await p.getByRole('button',{name:'Notifications',exact:true}).click();const d=p.getByRole('dialog',{name:'Notifications'});await expect(d.getByRole('button',{name:'Retry notifications'})).toBeVisible();notifications=true;await d.getByRole('button',{name:'Retry notifications'}).click();await expect(d.getByText('Synthetic post needs review')).toBeVisible();
 for(const width of [1440,1280,1024,768,430,390,360]){await p.setViewportSize({width,height:900});const box=await d.boundingBox();expect(box.x>=0&&box.x+box.width<=width+1).toBe(true)}
 await p.screenshot({path:'tests/e2e/notifications-360.png'});await p.keyboard.press('Escape');await expect(d).toBeHidden();await expect(p.getByRole('button',{name:'Notifications',exact:true})).toBeFocused();
 healthy=true;await p.getByRole('button',{name:'Retry settings'}).click();await expect(p.locator('textarea').first()).toHaveValue('Existing brand details',{timeout:30000});
 await p.getByRole('tab',{name:/Billing & Plan/}).click();await expect(p.getByRole('button',{name:'Retry billing'})).toBeVisible();await p.getByRole('tab',{name:/Billing & Plan/}).focus();await p.keyboard.press('ArrowLeft');await expect(p.getByRole('tab',{name:'Business Brain'})).toHaveAttribute('aria-selected','true');
 healthy=false;await p.goto('http://localhost:3000/dashboard/integrations',{timeout:120000});await expect(p.getByRole('button',{name:'Retry connections'})).toBeVisible({timeout:30000});healthy=true;await p.getByRole('button',{name:'Retry connections'}).click();await expect(p.getByRole('button',{name:'Retry connections'})).toHaveCount(0);expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 expect(errors).toEqual([]);console.log('PASS settings load protection/retry, malformed notification storage, notification retry/focus/seven widths, connection failure/retry');await c.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
