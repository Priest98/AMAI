const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch();try{
 const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await c.addInitScript(()=>localStorage.setItem('amai_user',JSON.stringify({id:'qa',email:'qa@example.com',name:'QA',brandId:'qa-brand',expiresAt:'2099-01-01'})));
 let failLoad=true;const post={id:'qa-post',caption:'Synthetic review post',hashtags:['#test'],status:'NEEDS_APPROVAL',scheduledAt:new Date().toISOString(),targets:[{platform:'TIKTOK'}],media:[]};
 await c.route('**/api/**',r=>{const req=r.request(),u=new URL(req.url());let status=200,data={};
 if(u.pathname.endsWith('/auth/me'))data={onboardingCompleted:true};
 else if(u.pathname.endsWith('/posts/qa-post')&&req.method()==='PATCH'){status=503;data={message:'Save unavailable. Please retry.'}}
 else if(u.pathname.endsWith('/engine/state'))data={timeZone:'UTC',state:'PAUSED',approvalMode:'MANUAL',postsPerDay:1};
 else if(u.pathname.endsWith('/posts')){status=failLoad?503:200;data=failLoad?{message:'Unavailable'}:u.searchParams.get('status')==='NEEDS_APPROVAL'?[post]:[]}
 else{status=503;data={message:'Controlled unavailable response'}}
 return r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})});
 const p=await c.newPage();await p.goto('http://localhost:3000/dashboard/calendar',{timeout:90000});await p.getByRole('button',{name:'Retry calendar'}).waitFor({timeout:30000});failLoad=false;await p.getByRole('button',{name:'Retry calendar'}).click();
 const trigger=p.getByRole('button').filter({hasText:'Synthetic review post'});await trigger.click();const d=p.getByRole('dialog',{name:'Review post'});await expect(d).toBeVisible();
 await d.getByLabel('Caption',{exact:true}).fill('Changed caption');await expect(d.getByRole('button',{name:'Approve',exact:true})).toBeDisabled();await d.getByRole('button',{name:'Save',exact:true}).click();await expect(d.getByRole('status')).toContainText('Save unavailable');await expect(d.getByLabel('Caption',{exact:true})).toHaveValue('Changed caption');
 for(let i=0;i<12;i++){await p.keyboard.press('Tab');expect(await d.evaluate(e=>e.contains(document.activeElement))).toBe(true)}
 for(const width of [1440,1280,1024,768,430,390,360]){await p.setViewportSize({width,height:900});const box=await d.boundingBox();expect(box.x>=0&&box.x+box.width<=width+1).toBe(true)}
 await p.screenshot({path:'tests/e2e/calendar-review-360.png'});await p.keyboard.press('Escape');await expect(d).toBeHidden();await expect(trigger).toBeFocused();
 failLoad=true;await p.goto('http://localhost:3000/dashboard/approval-queue');await expect(p.getByRole('button',{name:'Retry queue'})).toBeVisible({timeout:30000});await expect(p.getByText('All caught up',{exact:true})).toHaveCount(0);
 for(const width of [1440,1280,1024,768,430,390,360]){await p.setViewportSize({width,height:900});expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)}
 await p.goto('http://localhost:3000/dashboard/media',{timeout:90000});await expect(p.getByRole('button',{name:'Single post',exact:true})).toHaveAttribute('aria-pressed','true',{timeout:30000});await p.getByRole('button',{name:'Carousel',exact:true}).click();await expect(p.getByRole('button',{name:'Carousel',exact:true})).toHaveAttribute('aria-pressed','true');
 console.log('PASS calendar focus, Escape restoration, unsaved approval guard, failed-save preservation, queue failure state, seven-width geometry, composer selection');await c.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
