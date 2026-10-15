import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import {writeStorageReport} from './storage-report.mjs';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Servidor indisponível')),15000);server.stdout.on('data',data=>{const m=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/');}});server.once('error',reject);server.once('exit',()=>{clearTimeout(timer);reject(Error('Servidor encerrou'));});});
 browser=await chromium.launch();const context=await browser.newContext(),page=await context.newPage();await page.goto(base);
 const cdp=await context.newCDPSession(page),measurements=[];
 for(const cpu of [1,4]){
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  for(const count of [10,50,100,500]){
   const result=await page.evaluate(async({count,cpu})=>{
    const {completedFixture}=await import('./tests/fixtures.mjs'),{validateImport}=await import('./core.js'),{validatePractical}=await import('./practical.js');
    const content=await fetch('data/content.json').then(r=>r.json()),material=await fetch('data/games.json').then(r=>r.json());
    const template=completedFixture(content,material.docs),values=Array.from({length:count},()=>{const a=structuredClone(template);a.id=crypto.randomUUID();a.office.assessmentId=a.id;return a;});
    const key='lado-a-benchmark-isolated',times={serialize:[],write:[],read:[],initialValidation:[]};let quotaFailures=0,bytes=0,characters=0;
    const measure=(name,fn)=>{const start=performance.now(),value=fn();times[name].push(performance.now()-start);return value;};
    for(let i=0;i<20;i++){
     localStorage.removeItem(key);const text=measure('serialize',()=>JSON.stringify(values));bytes=new TextEncoder().encode(text).length;characters=text.length;let written=false;
     try{measure('write',()=>localStorage.setItem(key,text));written=true;}catch(e){if(e.name!=='QuotaExceededError')throw e;quotaFailures++;}
     if(written)measure('read',()=>localStorage.getItem(key));
     measure('initialValidation',()=>JSON.parse(text).map(a=>validatePractical(validateImport(a,material.docs),material.games,material.matrix)));
    }
    localStorage.removeItem(key);
    const stats=values=>{if(!values.length)return null;values.sort((a,b)=>a-b);return {samples:values.length,medianMs:+((values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2).toFixed(2),p95Ms:+values[Math.ceil(values.length*.95)-1].toFixed(2)};};
    return {cpu,count,bytes,characters,eventsPerAssessment:template.office.events.length,quotaFailures,times:Object.fromEntries(Object.entries(times).map(([k,v])=>[k,stats(v)]))};
   },{count,cpu});measurements.push(result);console.log(JSON.stringify(result));
  }
 }
 const report={date:new Date().toISOString(),browser:browser.version(),platform:`${os.platform()} ${os.arch()}`,cpu:os.cpus()[0]?.model,repetitions:20,notes:'Contexto Chromium novo; chave isolada. Validação usa o JSON em memória mesmo quando há falha de quota. Escrita mede apenas chamadas bem-sucedidas. Leitura não executada quando a quota impede gravar.',measurements};
 await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/storage-benchmark.json',JSON.stringify(report,null,2)+'\n');await writeStorageReport(report);
}finally{await browser?.close();server.kill();}
