import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readAssessmentPDF} from '../assessment-pdf.js';
const require=createRequire(import.meta.url),runtime='C:/Users/Rickn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||`${runtime}/playwright`);globalThis.PDFLib=require(`${runtime}/pdf-lib`);
const browser=await chromium.launch({headless:true,channel:'chrome'}),base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/';
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(`${base}?teste=1`);assert.equal(await page.locator('.sidebar').count(),0);
  await page.locator('[data-external-field="code"]').fill('TESTE-EXTERNO · fictício');await page.locator('[data-external-field="communication"]').fill('Escrita');await page.locator('[data-external-field="agreement"]').check();await page.locator('[data-external-action="start"]').click();
  for(let i=0;i<28;i++){await page.locator('[data-external-answer]').fill(`Resposta fictícia ${i+1}: organização, experiência e comunicação.`);assert.equal(await page.locator('[data-key="score"]').count(),0);await page.locator('[data-external-action="next"]').click();}
  await page.reload();await page.locator('[data-external-action="office"]').click();
  for(let step=1;step<=5;step++){
   if([2,4].includes(step)){const q=step===2?'instructionOrder':'instructionRule';await page.locator(`[data-office-answer="${q}"]`).fill(step===2?'Ordenar por prazo.':'Pendentes vão para Verificar.');await page.locator('[data-office="release-instruction"]').click();}
   if(step===2)await page.locator('[data-office-answer="checkOrder"]').fill('Comparei as datas de dois documentos.');
   if(step===3)await page.locator('[data-office-answer="checkUrgency"]').fill('Comparei D06 com o prazo limite.');
   if(step===5)await page.locator('#office-message').fill('Mensagem final fictícia com caracteres: ação, experiência e café.');
   await page.locator('[data-office="first"]').click();
   if(step<5)await page.locator('[data-office="complete"]').click();
   else{const downloaded=page.waitForEvent('download');await page.locator('[data-office="complete"]').click();const pdf=await downloaded;assert.ok(pdf.suggestedFilename().endsWith('.pdf'));const bytes=await fs.readFile(await pdf.path());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    const restored=await readAssessmentPDF(bytes);assert.equal(restored.office.status,'completed');assert.equal(restored.external.phase,'done');assert.equal(Object.keys(restored.integrated.records).length,28);assert.equal(restored.office.stages[4].final.response.text,'Mensagem final fictícia com caracteres: ação, experiência e café.');
    await fs.mkdir('output/pdf',{recursive:true});await fs.writeFile(`output/pdf/teste-externo-${width}.pdf`,bytes);
    const key='lado-a-teste-externo-v1';const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],key);assert.deepEqual(restored,saved);
    await page.screenshot({path:`artifacts/external-finished-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.reload();const second=page.waitForEvent('download');await page.locator('[data-external-action="pdf"]').click();await second;
    // Receiving evaluator imports the actual downloaded PDF, preserving the whole record.
    const assessor=await context.newPage();await assessor.goto(base);await assessor.locator('.more-actions summary').click();await assessor.locator('[data-action="import"]').click();await assessor.locator('#import-file').setInputFiles({name:'recebido.pdf',mimeType:'application/pdf',buffer:bytes});
    await assessor.waitForFunction(()=>document.querySelector('#toast').textContent.includes('importada'));await assessor.locator('nav [data-value="3"]').click();await assessor.locator('[data-action="office-review"]').click();assert.equal(await assessor.locator('.office-review-op').count(),8);await assessor.close();
   }
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: external Discovery + Office, desktop/phone, final PDF download, radar document, lossless embedded data, reload, repeat download and evaluator PDF import.');
}finally{await browser.close();}
