const { chromium, expect }=require('@playwright/test');
(async()=>{const b=await chromium.launch();try{
 const c=await b.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();await p.goto('http://localhost:3000');await expect(p.locator('html')).toHaveClass(/lenis/);
 await p.emulateMedia({reducedMotion:'reduce'});await expect(p.locator('html')).not.toHaveClass(/lenis/);
 await p.emulateMedia({reducedMotion:'no-preference'});await expect(p.locator('html')).toHaveClass(/lenis/);
 await p.getByRole('link',{name:'Sign in',exact:true}).first().click();await p.waitForURL('**/login',{timeout:30000});await expect(p.locator('h1')).toContainText('Welcome back',{timeout:30000});await expect(p.locator('html')).not.toHaveClass(/lenis/);await c.close();
 const n=await b.newContext({javaScriptEnabled:false});const q=await n.newPage();await q.goto('http://localhost:3000');await expect(q.locator('h1')).toBeVisible();await expect(q.getByText('Your voice.',{exact:false})).toBeVisible();await n.close();
 console.log('PASS motion preference changes, route cleanup, and server-visible content without JavaScript');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
