import {launchBrowser,base} from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await launchBrowser();
try{
 const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='lado-a-teste-externo-v1')throw new DOMException('Quota','QuotaExceededError');return original.call(this,key,value);};});
 await page.goto(base+'?teste=1');
 await page.locator('[data-external-field="code"]').fill('BACKUP fictício');
 await page.locator('#storage-recovery').waitFor();
 const downloaded=page.waitForEvent('download');await page.locator('#storage-recovery button').click();
 const backup=JSON.parse(await fs.readFile(await (await downloaded).path(),'utf8'));
 assert.equal(backup.identity.code,'BACKUP fictício');assert.equal(backup.assisted.version,1);
 assert.deepEqual(errors,[]);await context.close();

 const clean=await browser.newContext(),p=await clean.newPage();await p.goto(base);assert.equal(await p.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/legacy-history.js'))),false);
 const result=await p.evaluate(async()=>{
  const {createAssessment}=await import('./core.js');const {createAssessmentPDF,readAssessmentPDF}=await import('./assessment-pdf.js');
  const {ensureAccompanied,confirmDiscoveryDecision}=await import('./accompanied.js');const {blankRecord,discoveryQuestions}=await import('./integrated.js');
  const content=await fetch('data/content.json').then(r=>r.json()),docs=(await fetch('data/games.json').then(r=>r.json())).docs;
  const a=createAssessment();a.identity.code='Antes';const promise=createAssessmentPDF(a,content,docs);a.identity.code='Depois';
  const restored=await readAssessmentPDF(await promise);
  ensureAccompanied(a);const q=discoveryQuestions(content).find(q=>q.domain===0);a.integrated.records[q.id]={...blankRecord(),answer:'Evidência original',score:2};confirmDiscoveryDecision(a,q,'classified');
  localStorage.setItem('lado-a-evaluations-v1',JSON.stringify([a]));return {restored:restored.identity.code,id:q.id};
 });
 assert.equal(result.restored,'Antes');await p.reload();
 await p.locator('[data-action="start-interview"]').click();await p.locator('[data-action="dr-continue"]').click();
 const option=await p.locator('#dr-jump option').evaluateAll((els,id)=>els.find(e=>e.textContent.includes(id+' ·')).value,result.id);
 await p.selectOption('#dr-jump',option);await p.locator(`[data-ir="${result.id}"][data-key="answer"]`).fill('Evidência revista');
 await p.locator(`[data-ir="${result.id}"][data-key="score"][value="1"]`).check();await p.locator('[data-action="dr-confirm"]').click();
 const valid=await p.evaluate(async id=>{const {discoveryDecided}=await import('./discovery-decision.js');return discoveryDecided(JSON.parse(localStorage.getItem('lado-a-evaluations-v1'))[0],id);},result.id);
 assert.equal(valid,true);await clean.close();
 console.log('PASS: storage failure backup, immutable PDF snapshot, imported accompanied Discovery re-confirmation.');
}finally{await browser.close();}
