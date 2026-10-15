import {launchBrowser,base} from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAssessment} from '../core.js';
import {createOffice,applyOffice,officeStage} from '../office.js';
const docs=JSON.parse(fs.readFileSync(new URL('../data/games.json',import.meta.url))).docs;
const browser=await launchBrowser(),key='lado-a-evaluations-v1';
function fixture(){
 const a=createAssessment(),s=a.office=createOffice(a.id,{demo:true});a.identity.code='MATRIX-DEMO · fictício';
 while(s.status==='active'){
  const step=s.currentStage,state=officeStage(s).current;
  for(const question of Object.keys(state.answers))applyOffice(s,'answer',{question,value:question==='checkOrder'?'Comparei D12 de 14/06 com D01 de 16/06.':question==='checkUrgency'?'Conferi D06 de 17/06 com o limite de 17/06, inclusive.':question==='instructionOrder'?'Vou ordenar os documentos do prazo mais próximo ao mais distante.':'Os pendentes vão a Verificar, inclusive quando urgentes.',mode:question==='checkOrder'?'oral':'written'});
  if(!state.instructionReleased)applyOffice(s,'release-instruction');
  if(step===3)for(const d of docs)if(d.date.split('/').reverse().join('-')<='2027-06-17')applyOffice(s,'urgent',{document:d.id,value:true});
  if(step===4)for(const d of docs)applyOffice(s,'move',{document:d.id,destination:d.status==='PENDENTE'?'VERIFICAR':d.sector});
  if(step===5)applyOffice(s,'text',{value:'Separei D04 e D11 em Verificar porque estavam pendentes.'});
  applyOffice(s,'first');applyOffice(s,'complete');
 }
 return a;
}
try{
 for(const width of [1440,768]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const a=fixture();await page.goto(base);await page.evaluate(({key,a})=>localStorage.setItem(key,JSON.stringify([a])),{key,a});await page.reload();
  await page.locator('nav [data-value="3"]').click();await page.locator('[data-action="office-start"]').click();assert.equal(await page.locator('[data-office-review-action]').count(),0,'No review controls in participant Office');await page.locator('.office-completed [data-office="exit"]').click();
  await page.locator('[data-action="office-review"]').click();assert.match(await page.locator('h2').first().innerText(),/Revisão/);
  const review=id=>page.locator(`#review-${id}`),field=(id,k)=>review(id).locator(`[data-office-review-key="${k}"]`),use=id=>review(id).locator('[data-office-review-action="suggest"]').click(),confirm=id=>review(id).locator('[data-office-review-action="confirm"]').click();
  const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],key);
  await use('urgency');assert.equal((await read()).officeReview.records.urgency.confirmedAt,null);await confirm('urgency');assert.match(await page.locator('.office-results tbody tr').nth(2).innerText(),/1 oportunidade/);
  await use('update-rule');await confirm('update-rule');assert.match(await page.locator('.office-results tbody tr').nth(2).innerText(),/100/);
  for(const id of ['understand-order','understand-rule','communication']){
   await field(id,'component0').selectOption('true');await field(id,'component1').selectOption('true');await use(id);
   if(id==='understand-rule'){await field(id,'autonomy').selectOption('assisted');await confirm(id);assert.match(await page.locator('#toast').innerText(),/apoio/);assert.equal((await read()).officeReview.records[id].confirmedAt,null);await field(id,'support').fill('Repetição literal da orientação.');await field(id,'access').fill('Texto ampliado e pausa.');}
   await confirm(id);
  }
  assert.match(await page.locator('.office-results tbody tr').nth(0).innerText(),/100/);assert.match(await page.locator('.office-results tbody tr').nth(4).innerText(),/Dados insuficientes — 1 oportunidade/);
  for(const id of ['check-order','check-urgency']){await field(id,'component0').selectOption('true');await field(id,'component1').selectOption(id==='check-order'?'false':'true');await use(id);await confirm(id);}
  assert.match(await page.locator('.office-results tbody tr').nth(3).innerText(),/75/);
  await use('sequence');await field('sequence','score').selectOption('2');
  const suggestion=(await read()).officeReview.records.sequence.score;
  // An override must have a reason when different from the objective suggestion.
  const auto=await review('sequence').locator('[id^="office-suggestion-"]').innerText();const automaticScore=Number(auto.match(/Nota sugerida: (\d)/)[1]);
  await field('sequence','score').selectOption(String(automaticScore===2?1:2));await confirm('sequence');assert.match(await page.locator('#toast').innerText(),/ajuste/);await field('sequence','reason').fill('Ajuste profissional documentado.');await confirm('sequence');
  assert.match(await page.locator('.office-results tbody tr').nth(1).innerText(),/Dados insuficientes — 1 oportunidade/);assert.equal(suggestion,2);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`artifacts/office-review-${width}.png`});await review('understand-rule').screenshot({path:`artifacts/office-review-opportunity-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.reload();assert.equal(await page.locator('.office-review').count(),1);assert.ok((await read()).officeReview.records['understand-rule'].confirmedAt);
  await field('urgency','access').fill('Condição atualizada.');assert.equal((await read()).officeReview.records.urgency.confirmedAt,null);
  await field('urgency','condition').selectOption('barrier');await confirm('urgency');assert.match(await page.locator('#toast').innerText(),/motivo/);await field('urgency','reason').fill('Barreira impeditiva identificada pelo avaliador.');await confirm('urgency');assert.match(await page.locator('.office-results tbody tr').nth(2).innerText(),/1 oportunidade/);
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const downloaded=await downloadPromise;const exported=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.equal(exported.officeReview.matrixVersion,'office-matrix-1');assert.equal(exported.office.version,2);
  await page.locator('[data-action="office-review-exit"]').click();await page.locator('nav [data-value="4"]').click();assert.equal(await page.locator('.office-results').count(),1);assert.equal(await page.locator('.office-results svg').count(),0,'Matrix prepared without changing existing radar');
  if(!await page.locator('[data-action="import"]').isVisible())await page.locator('.more-actions summary').click();await page.locator('[data-action="import"]').click();await page.locator('#import-file').setInputFiles({name:'matrix.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).length===2,key);const imported=await read();assert.notEqual(imported.id,exported.id);assert.equal(imported.officeReview.evidenceKey,exported.officeReview.evidenceKey);assert.equal(imported.officeReview.records['understand-rule'].score,2);
  await page.locator('nav [data-value="3"]').click();await page.locator('[data-action="office-review"]').click();assert.ok((await read()).officeReview.records['understand-rule'].confirmedAt);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: matrix review desktop/tablet, components, confirmation, support, overrides, coverage, reload, export and participant separation.');
}finally{await browser.close();}
