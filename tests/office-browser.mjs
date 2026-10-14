import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Rickn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const storage='lado-a-evaluations-v1';
try{
 for(const width of [1440,768]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:4173/');
  assert.equal((await page.request.get('http://127.0.0.1:4173/office.js')).status(),200,'Server serves current workspace');
  await page.locator('nav [data-value="3"]').click();await page.locator('[data-action="office-demo"]').click();
  const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],storage);
  assert.equal(await page.locator('.office-shell').count(),1);assert.equal(await page.locator('.sidebar').count(),0);
  assert.equal(await page.locator('.office-document').count(),12);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/office-classification-${width}.png`,fullPage:true});
  await page.locator('[data-office-destination="D01"]').selectOption('RH');
  await page.locator('[data-document="D02"].office-document').dragTo(page.locator('.office-drop-target[data-folder="FINANCEIRO"]'),{sourcePosition:{x:15,y:15}});
  assert.equal((await read()).office.stages[0].current.placements.D02,'FINANCEIRO');
  await page.locator('[data-office="help"]').click();assert.match(await page.locator('#office-feedback').innerText(),/Chame o avaliador/);
  await page.locator('[data-office="pause"]').click();assert.equal(await page.locator('.office-task').getAttribute('disabled'),'');
  await page.locator('[data-office="resume"]').click();
  await page.locator('[data-office="first"]').click();assert.equal((await read()).office.stages[0].first.response.placements.D01,'RH');
  await page.locator('[data-office-destination="D01"]').selectOption('OPERAÇÕES');await page.locator('[data-office="complete"]').click();
  assert.equal((await read()).office.stages[0].final.response.placements.D01,'OPERAÇÕES');await page.locator('[data-office-answer="instructionOrder"]').fill('Vou ordenar os documentos por prazo.');await page.locator('[data-office-answer-mode="instructionOrder"]').selectOption('oral');await page.screenshot({path:`artifacts/office-instruction-${width}.png`});await page.locator('[data-office="release-instruction"]').click();await page.waitForTimeout(100);
  const order=(await read()).office.stages[1].initial.order;
  await page.locator(`[data-document="${order[0]}"].office-document`).dragTo(page.locator(`[data-document="${order[1]}"].office-document`),{sourcePosition:{x:15,y:15}});
  assert.equal((await read()).office.stages[1].current.order[1],order[0]);
  await page.locator(`[data-office="up"][data-document="${order[0]}"]`).click();assert.equal((await read()).office.stages[1].current.order[0],order[0]);
  await page.reload();await page.locator('[data-office="resume"]').waitFor();assert.equal((await read()).office.status,'paused');
  assert.deepEqual((await read()).office.stages[1].initial.order,order);await page.locator('[data-office="resume"]').click();
  // Keyboard activation uses exactly the same reordering operation.
  await page.locator(`[data-office="down"][data-document="${order[0]}"]`).focus();await page.keyboard.press('Enter');assert.equal((await read()).office.stages[1].current.order[1],order[0]);
  await page.locator('[data-office-answer="checkOrder"]').fill('Primeira descrição da conferência.');await page.locator('[data-office="first"]').click();await page.locator('[data-office-answer="checkOrder"]').fill('Descrição final da conferência.');await page.locator('[data-office="complete"]').click();assert.equal((await read()).office.stages[1].first.response.answers.checkOrder.text,'Primeira descrição da conferência.');assert.equal((await read()).office.stages[1].final.response.answers.checkOrder.text,'Descrição final da conferência.');assert.equal((await read()).office.stages[1].final.response.answers.instructionOrder.mode,'oral');
  assert.deepEqual((await read()).office.stages[2].current.urgent,[]);
  await page.locator('[data-office-urgent="D12"]').check();await page.locator('[data-office="first"]').click();await page.locator('[data-office-urgent="D01"]').check();await page.locator('[data-office="complete"]').click();
  await page.locator('[data-office="release-instruction"]').click();await page.waitForTimeout(100);assert.deepEqual((await read()).office.stages[3].current.urgent,[]);assert.ok(Object.values((await read()).office.stages[3].current.placements).every(v=>v==='RECEBIDOS'));
  await page.locator('[data-office-destination="D01"]').selectOption('VERIFICAR');await page.locator('[data-office="first"]').click();await page.locator('[data-office="complete"]').click();
  assert.match(await page.locator('.office-summary').innerText(),/Verificar: D01/);assert.doesNotMatch(await page.locator('.office-summary').innerText(),/Verificar: D04/);
  await page.locator('#office-message').fill('Primeira mensagem fictícia.');await page.locator('[data-office="first"]').click();
  await page.locator('#office-message').fill('Texto revisado antes de pausar.');await page.locator('[data-office="pause"]').click();
  await page.reload();await page.locator('[data-office="resume"]').click();assert.equal(await page.locator('#office-message').inputValue(),'Texto revisado antes de pausar.');
  await page.screenshot({path:`artifacts/office-communication-${width}.png`,fullPage:true});
  await page.locator('[data-office="complete"]').click();const done=await read();assert.equal(done.office.status,'completed');assert.equal(done.office.stages[4].first.response.text,'Primeira mensagem fictícia.');assert.equal(done.office.stages[4].final.response.text,'Texto revisado antes de pausar.');
  assert.equal(Object.keys(done.practical).length,0);assert.equal(Object.keys(done.integrated.records).length,0);
  const downloadPromise=page.waitForEvent('download');await page.locator('.office-completed [data-office="export"]').click();const download=await downloadPromise;
  const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.deepEqual(exported,done.office);
  await page.locator('.office-completed [data-office="exit"]').click();if(!await page.locator('[data-action="import"]').isVisible())await page.locator('.more-actions summary').click();await page.locator('[data-action="import"]').click();
  await page.locator('#import-file').setInputFiles({name:'office-complete.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(done))});
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).length===3,storage);const imported=await read();assert.notEqual(imported.id,done.id);assert.equal(imported.office.assessmentId,imported.id);assert.equal(imported.office.sourceAssessmentId,done.id);
  await page.locator('[data-action="office-start"]').click();assert.equal(await page.locator('.office-completed').count(),1);await page.locator('.office-completed [data-office="exit"]').click();
  // Invalid import is rejected without replacing any assessment.
  const before=await page.evaluate(key=>localStorage.getItem(key),storage),bad=structuredClone(done);bad.office.stages[0].first.response.placements.D01='FINANCEIRO';
  if(!await page.locator('[data-action="import"]').isVisible())await page.locator('.more-actions summary').click();await page.locator('[data-action="import"]').click();await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('inválidos'));assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage),before);
  await page.locator('[data-action="office-demo"]').click();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('Quota exceeded');};});
  await page.locator('[data-office-destination="D03"]').selectOption('RH');assert.match(await page.locator('#save-status').innerText(),/Falha ao salvar/);
  const failureDownload=page.waitForEvent('download');await page.locator('.office-panel [data-office="export"]').click();const result=await failureDownload;const fallback=JSON.parse(await fs.readFile(await result.path(),'utf8'));assert.equal(fallback.stages[0].current.placements.D03,'RH');
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
 }
 console.log('PASS: Office desktop/tablet, five stages, drag/select/keyboard, first/final, reload, pause/help, JSON export/import, rejection and save failure.');
}finally{await browser.close();}
