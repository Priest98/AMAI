const {chromium,expect}=require('@playwright/test');
(async()=>{const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('amai_user',JSON.stringify({id:'qa',email:'qa@example.com',name:'QA',brandId:'qa-brand',expiresAt:'2099-01-01T00:00:00.000Z'})));
 let onboarding=false,failSave=true,success=false;const writes=[];
 await context.route('**/api/**',async route=>{
 const req=route.request(),path=new URL(req.url()).pathname;
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(success && path.endsWith('/engine/state'))return reply({state:'PAUSED',approvalMode:'MANUAL'});
 if(success && path.endsWith('/posts/stats'))return reply({needsApprovalCount:0,scheduledCount:0,publishedCount:0,mediaCount:0,pendingPreview:[]});
 if(success && path.endsWith('/oauth/accounts'))return reply({socialAccounts:[],googleDrive:null});
 if(path.endsWith('/auth/me'))return reply({onboardingCompleted:onboarding});
 if(path.endsWith('/business-brain')&&req.method()==='PATCH'){writes.push({path,body:req.postDataJSON()});return reply(failSave?{message:'Test save failure'}:{success:true},failSave?503:200)}
 if(path.endsWith('/auth/onboarding')){writes.push({path,body:req.postDataJSON()});return reply({success:true})}
 return reply({message:'Controlled unavailable response'},503);
 });
 const page=await context.newPage();await page.goto('http://localhost:3000/dashboard',{timeout:90000});
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible({timeout:30000});await dialog.getByRole('button',{name:/do this/}).click();
 await dialog.getByLabel('Business description').fill('We make durable bags.');await dialog.getByRole('button',{name:'Next',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('could not be saved');await expect(dialog.getByLabel('Business description')).toHaveValue('We make durable bags.');expect(writes.some(w=>w.path.endsWith('/auth/onboarding'))).toBe(false);
 failSave=false;await dialog.getByRole('button',{name:'Next',exact:true}).click();await expect(dialog.getByLabel('Target audience')).toBeVisible();
 expect(writes.at(-1).body).toEqual({businessDescription:'We make durable bags.'});
 await page.keyboard.press('Escape');await expect(dialog).toBeVisible();
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true)}
 await dialog.getByRole('button',{name:'Skip for now'}).click();await expect(dialog).toBeHidden();expect(writes.at(-1).body).toEqual({skipped:true});
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();await expect(page.getByText('Oyinca Active',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 onboarding=true;success=true;await page.reload();await expect(page.getByRole('heading',{name:'Give Oyinca something to work with'})).toBeVisible({timeout:30000});await expect(page.getByRole('link',{name:'Upload content',exact:true}).first()).toHaveAttribute('href','/dashboard/media');
 for(const width of [1440,1280,1024,768,430,390,360]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)}
 await page.screenshot({path:'tests/e2e/dashboard-360.png'});
 console.log('PASS onboarding failed save retains answers, retry persists only filled fields, completion ordering, focus containment, and dashboard unavailable/retry state');
 await context.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
