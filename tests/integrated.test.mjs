import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questions,discoveryQuestions,RESERVE,blankRecord,integratedResults} from '../integrated.js';
import {createAssessment,validateImport,results} from '../core.js';
import {validatePractical} from '../practical.js';
const content=JSON.parse(fs.readFileSync(new URL('../data/content.json',import.meta.url))),material=JSON.parse(fs.readFileSync(new URL('../data/games.json',import.meta.url))),qs=questions(content);
test('52 perguntas com rastreabilidade das 66 originais e sete habilidades',()=>{
 assert.equal(qs.length,52);assert.equal(qs.filter(q=>q.source==='Relato Discovery').length,28);assert.equal(qs.filter(q=>q.source==='Sondagem RFT').length,24);
 assert.equal(new Set(qs.map(q=>q.id)).size,52);assert.equal(new Set([...qs.flatMap(q=>q.sources),...RESERVE]).size,66);
 assert.equal(qs.filter(q=>q.domain===null).length,16);
 for(let d=0;d<7;d++)assert.ok(qs.filter(q=>q.domain===d).length>=2);
});
test('zero é válido, ausência excluída, duas evidências mínimas e ajuda separada',()=>{
 const a=createAssessment();a.integrated.records.D09={...blankRecord(),answer:'Evidência fictícia',score:0};
 assert.equal(integratedResults(a,qs)[0].interview,null);
 a.integrated.records.D17={...blankRecord(),answer:'Pedido de esclarecimento',score:1,help:'Pista'};
 const r=integratedResults(a,qs)[0];assert.equal(r.interview,25);assert.equal(r.reported,2);assert.equal(r.practical,null);assert.equal(r.integrated,null);
 a.integrated.records['R1.1']={...blankRecord(),answer:'Envelopes',score:2};assert.equal(integratedResults(a,qs)[0].interview,25);
});
test('importação rejeita notas descritivas, crédito parcial binário e respostas vazias',()=>{
 const a=createAssessment();a.integrated.records.D01={...blankRecord(),answer:'Preferência',score:0};assert.throws(()=>validateImport(a));
 a.integrated.records={'R1.1':{...blankRecord(),answer:'Algo',score:1}};assert.throws(()=>validateImport(a));
 a.integrated.records={D09:{...blankRecord(),score:2}};assert.throws(()=>validateImport(a));
 a.integrated.records={D09:{...blankRecord(),answer:'Algo',score:2,evidenceIds:['inventada']}};assert.throws(()=>validatePractical(a,material.games,material.matrix));
});
test('v2 mantém todos os registros antigos sem converter classificações',()=>{
 const a=createAssessment();delete a.integrated;a.schema=2;a.protocol='Piloto digital 0.2';a.interview.D01={answer:'Preferência anterior',notes:'Nota anterior',qualifier:'none',evidenceIds:[]};
 const b=validateImport(a);assert.equal(b.schema,4);assert.deepEqual(b.interview,a.interview);assert.deepEqual(b.integrated.records,{});assert.equal(b.previousProtocol,a.protocol);assert.equal(b.protocol,'Entrevista Discovery 0.4');
 assert.deepEqual(validateImport(JSON.parse(JSON.stringify(b))),b);
 const before=results(b,content,material.matrix);b.integrated.records.D09={...blankRecord(),answer:'Evidência',score:2};assert.deepEqual(results(b,content,material.matrix),before);
});

test('Discovery tem 28 perguntas, cinco eixos e 12 classificáveis; RFT não modifica radar',()=>{
 const current=discoveryQuestions(content),a=createAssessment();assert.equal(current.length,28);assert.equal(current.filter(q=>q.domain===null).length,16);assert.equal(current.filter(q=>q.domain!==null).length,12);
 assert.deepEqual(integratedResults(a,current).map(r=>r.total),[2,2,2,2,4]);
 for(const q of current.filter(q=>q.domain!==null))a.integrated.records[q.id]={...blankRecord(),answer:'Relato fictício',score:2};
 const before=integratedResults(a,current);assert.ok(before.every(r=>r.interview===100));
 a.integrated.records['R1.1']={...blankRecord(),answer:'Divergência',score:0};a.verbal['R1.1']={status:'observado',correct:false,independent:true};a.practical.A1={draft:{}};a.matrixReviewed=true;
 assert.deepEqual(integratedResults(a,current),before);assert.deepEqual(integratedResults(a,qs),before);
});
test('migração v3 retoma pela pergunta Discovery e preserva classificação, primeira resposta e RFT',()=>{
 const original=createAssessment();original.schema=3;original.protocol='Discovery RFT reduzido 0.3';original.integrated={version:'discovery-rft-0.3',lastQuestion:0,records:{D17:{...blankRecord(),answer:'Resposta',score:1,first:{answer:'Primeira',help:'',access:'',at:'2026-10-13'}},'R1.1':{...blankRecord(),answer:'Envelopes',score:2}}};
 for(const q of discoveryQuestions(content)){
  original.integrated.lastQuestion=qs.findIndex(p=>p.id===q.id);const migrated=validateImport(original);assert.equal(migrated.integrated.currentQuestionId,q.id);assert.equal(discoveryQuestions(content)[migrated.integrated.lastQuestion].id,q.id);assert.deepEqual(migrated.integrated.records,original.integrated.records);assert.deepEqual(validateImport(JSON.parse(JSON.stringify(migrated))),migrated);
 }
 original.integrated.lastQuestion=qs.findIndex(q=>q.id==='R1.1');const migrated=validateImport(original);assert.equal(migrated.integrated.currentQuestionId,'D01');assert.equal(migrated.integrated.lastQuestion,0);
 assert.equal(original.integrated.version,'discovery-rft-0.3');
 assert.throws(()=>validateImport({...migrated,integrated:{...migrated.integrated,currentQuestionId:'D17'}}));
});
