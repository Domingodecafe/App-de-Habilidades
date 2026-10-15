import {chromium} from 'playwright';
import fs from 'node:fs/promises';
export const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/';
export async function launchBrowser(){
 await fs.mkdir('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true});
 const create=browser.newContext.bind(browser);let n=0;
 browser.newContext=async options=>{
  const context=await create(options),id=`${process.pid}-${++n}`;
  await context.tracing.start({screenshots:true,snapshots:true});
  const close=context.close.bind(context);let closed=false;
  context.close=async()=>{if(closed)return;closed=true;for(const [i,page] of context.pages().entries())await page.screenshot({path:`artifacts/last-${id}-${i}.png`}).catch(()=>{});await context.tracing.stop({path:`artifacts/trace-${id}.zip`}).catch(()=>{});await close();};
  return context;
 };
 const close=browser.close.bind(browser);
 browser.close=async()=>{for(const context of browser.contexts())await context.close();await close();};
 return browser;
}
