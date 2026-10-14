import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAssessment,validateImport,results} from '../core.js';
import {createOffice,applyOffice,officeStage,validateOffice,getOfficeRecords,exportOfficeJSON,DOCUMENT_IDS} from '../office.js';
import {officeView} from '../office-view.js';
const material=JSON.parse(fs.readFileSync(new URL('../data/games.json',import.meta.url)));
const content=JSON.parse(fs.readFileSync(new URL('../data/content.json',import.meta.url)));
const materials=fs.readFileSync(new URL('../references/materials.txt',import.meta.url),'utf8');
const make=()=>createOffice('test',{random:()=>0.4});
function next(s){assert.ok(applyOffice(s,'first'));assert.ok(applyOffice(s,'complete'));validateOffice(s,'test');if(s.status==='active'&&officeStage(s).current.instructionReleased===false)applyOffice(s,'release-instruction');}

test('documentos originais preservados e setor não aparece nos cartões Office',()=>{
  assert.deepEqual(material.docs.map(d=>d.id),DOCUMENT_IDS);
  for(const d of material.docs){assert.ok(materials.includes(`${d.id} — ${d.name.toUpperCase()}`));assert.ok(materials.includes(`Setor: ${d.sector} | Prazo: ${d.date} | Status: ${d.status}`));}
  const html=officeView({office:make()},material.docs);
  for(const d of material.docs){const card=html.match(new RegExp(`<article[^>]*data-document="${d.id}"[\\s\\S]*?</article>`))[0];assert.ok(!card.includes('Setor:'));assert.ok(!card.includes('data-sector'));assert.ok(!card.includes('selected>RH'));assert.ok(card.includes('value="" selected disabled>Escolher destino'));}
});
test('primeira entrega imutável; revisões, destino, posições e final registrados',()=>{
  const s=make();applyOffice(s,'move',{document:'D01',destination:'FINANCEIRO'});applyOffice(s,'first');const first=structuredClone(officeStage(s).first);
  applyOffice(s,'move',{document:'D01',destination:'RH'});assert.deepEqual(officeStage(s).first,first);applyOffice(s,'complete');
  assert.equal(s.stages[0].final.response.placements.D01,'RH');assert.equal(s.stages[0].first.response.placements.D01,'FINANCEIRO');assert.equal(s.events.find(e=>e.action==='move').origin,'RECEBIDOS');assert.ok(Number.isInteger(s.events.find(e=>e.action==='move').toPosition));validateOffice(s,'test');
});
test('percurso completo isolado; omissões, pausas, ajuda e comunicação sem pontuação',()=>{
  const s=make();assert.equal(applyOffice(s,'complete'),false);applyOffice(s,'help');applyOffice(s,'pause');const paused=structuredClone(s);assert.equal(applyOffice(s,'move',{document:'D01',destination:'RH'}),false);assert.deepEqual(s,paused);validateOffice(s,'test');applyOffice(s,'resume');next(s);
  assert.deepEqual(officeStage(s).current.placements,{});const id=officeStage(s).current.order[0];applyOffice(s,'reorder',{document:id,position:11});next(s);
  assert.deepEqual(officeStage(s).current.urgent,[]);applyOffice(s,'urgent',{document:'D01',value:true});applyOffice(s,'first');applyOffice(s,'urgent',{document:'D01',value:false});applyOffice(s,'complete');assert.deepEqual(officeStage(s).current.urgent,[]);assert.ok(Object.values(officeStage(s).current.placements).every(v=>v==='RECEBIDOS'));
  applyOffice(s,'release-instruction');applyOffice(s,'move',{document:'D01',destination:'VERIFICAR'});next(s);assert.equal(officeStage(s).current.text,'');applyOffice(s,'text',{value:'Separei D01 por minha decisão.'});applyOffice(s,'first');applyOffice(s,'text',{value:'Mensagem revisada.'});applyOffice(s,'complete');assert.equal(s.status,'completed');validateOffice(s,'test');
  assert.equal(applyOffice(s,'text',{value:'Mudança proibida'}),false);assert.ok(s.events.every((e,i)=>e.sequence===i+1));assert.equal(s.stages[4].first.response.text,'Separei D01 por minha decisão.');assert.equal(s.stages[4].final.response.text,'Mensagem revisada.');
  assert.ok(!Object.hasOwn(s,'score'));const a=createAssessment();const before=results(a,content,material.matrix);a.office={...s,assessmentId:a.id};assert.deepEqual(results(a,content,material.matrix),before);assert.deepEqual(validateImport(JSON.parse(JSON.stringify(a))),a);
  const records=getOfficeRecords(a);records.stages[0].current.text='outside';assert.notEqual(a.office.stages[0].current.text,'outside');assert.deepEqual(JSON.parse(exportOfficeJSON(a)),a.office);
});
test('importação rejeita estados, eventos e snapshots inconsistentes',()=>{
  const s=make();applyOffice(s,'move',{document:'D01',destination:'RH'});applyOffice(s,'first');validateOffice(s,'test');
  const invalids=[x=>x.version=99,x=>x.assessmentId='other',x=>x.currentStage=3,x=>x.stages[0].current.order.pop(),x=>x.stages[0].current.placements.D01='VERIFICAR',x=>x.events[1].sequence=7,x=>x.events[1].after='OPERAÇÕES',x=>x.stages[0].first.response.placements.D01='FINANCEIRO',x=>x.status='completed',x=>x.events.pop()];
  for(const mutate of invalids){const value=structuredClone(s);mutate(value);assert.throws(()=>validateOffice(value,'test'));}
  assert.ok(validateImport(createAssessment()));
});
test('texto do participante escapado e resumo usa exclusivamente escolhas da etapa 4',()=>{
  const s=make();next(s);next(s);next(s);applyOffice(s,'move',{document:'D01',destination:'VERIFICAR'});next(s);applyOffice(s,'text',{value:'<script>alert(1)</script>'});
  const html=officeView({office:s},material.docs);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('<strong>Verificar:</strong> D01'));assert.ok(!html.includes('<strong>Verificar:</strong> D04'));
});
