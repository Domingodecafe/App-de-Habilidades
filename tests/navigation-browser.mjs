import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/Rickn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [1440,768]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('[data-action="start-interview"]').click();
  await page.locator('[data-action="dr-continue"]').click();
  const value=await page.locator('#dr-jump option').evaluateAll(els=>els.find(e=>e.textContent.includes('D09 ·')).value);
  await page.selectOption('#dr-jump',value);await page.waitForTimeout(100);
  const notes=page.locator('[data-key="notes"]');
  await notes.fill('Texto fictício para continuar depois da atualização.');
  await notes.evaluate(e=>{e.focus();e.setSelectionRange(12,12);e.scrollIntoView({block:'center'});});
  await page.waitForTimeout(100);const before=await page.evaluate(()=>scrollY);assert.ok(before>0);
  await page.reload();await page.waitForTimeout(200);
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<5,'Reload preserves scroll');
  assert.equal(await notes.inputValue(),'Texto fictício para continuar depois da atualização.');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'notes');
  assert.equal(await notes.evaluate(e=>e.selectionStart),12);
  await page.screenshot({path:`artifacts/interview-${width}.png`,fullPage:true});
  await page.locator('[data-action="dr-next"]').click();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>scrollY),0,'Next question starts at top');
  await page.locator('nav [data-value="4"]').click();await page.waitForTimeout(100);
  await page.locator('#tab-edit').click();await page.waitForTimeout(100);
  const fields=page.locator('.profile-panel:not([hidden]) textarea');await fields.last().fill('Perfil fictício em edição.');
  const editY=await page.evaluate(()=>scrollY);await page.reload();await page.waitForTimeout(200);
  assert.equal(await page.locator('#tab-edit').getAttribute('aria-selected'),'true');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-editY)<5);
  await page.locator('nav [data-value="0"]').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>scrollY),0,'Page starts at top');
  await page.locator('nav [data-value="4"]').click();await page.locator('#tab-summary').click();await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/premium-profile-${width}.png`,fullPage:true});
  await context.close();
 }
 console.log('PASS: desktop/tablet navigation top, reload scroll, question, profile tab, text, focus and caret.');
}finally{await browser.close();}
