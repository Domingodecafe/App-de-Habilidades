import {reportView} from '../integrated-view.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAssessment,validateImport} from '../core.js';
import {DISCOVERY_DOMAINS,integratedResults,discoveryQuestions} from '../integrated.js';
import {createOffice,applyOffice,officeStage,validateOffice} from '../office.js';
import {OPPORTUNITIES} from '../office-protocol.js';
import {scoreBand,objectiveEvidence,getOfficeEvaluation,officeResults,setOfficeReviewField,useOfficeSuggestion,confirmOfficeOpportunity,validateOfficeReview} from '../office-evaluation.js';
import {officeReviewView} from '../office-evaluation-view.js';
const docs=JSON.parse(fs.readFileSync(new URL('../data/games.json',import.meta.url))).docs;
const content=JSON.parse(fs.readFileSync(new URL('../data/content.json',import.meta.url)));
const date=d=>d.date.split('/').reverse().join('-');
function submit(s){assert.ok(applyOffice(s,'first'));assert.ok(applyOffice(s,'complete'));}
function completed(){
  const a=createAssessment(),s=a.office=createOffice(a.id,{random:()=>0.4});submit(s);
  applyOffice(s,'answer',{question:'instructionOrder',value:'Vou ordenar os documentos do prazo mais próximo ao mais distante.',mode:'written'});applyOffice(s,'release-instruction');
  docs.toSorted((a,b)=>date(a).localeCompare(date(b))).forEach((d,i)=>applyOffice(s,'reorder',{document:d.id,position:i}));
  applyOffice(s,'answer',{question:'checkOrder',value:'Comparei as datas. D12 de 14/06 vem antes de D01 de 16/06.',mode:'oral'});submit(s);
  for(const d of docs)if(date(d)<='2027-06-17')applyOffice(s,'urgent',{document:d.id,value:true});
  applyOffice(s,'answer',{question:'checkUrgency',value:'Conferi o limite de 17/06 inclusive; D06 de 17/06 está marcado.',mode:'alternative'});submit(s);
  applyOffice(s,'answer',{question:'instructionRule',value:'Os pendentes vão para Verificar, inclusive os urgentes.',mode:'written'});applyOffice(s,'release-instruction');
  for(const d of docs)applyOffice(s,'move',{document:d.id,destination:d.status==='PENDENTE'?'VERIFICAR':d.sector});submit(s);
  applyOffice(s,'text',{value:'Encaminhei D04 e D11 a Verificar porque estavam pendentes.'});submit(s);validateOffice(s,a.id);return a;
}
function field(a,id,key,value){setOfficeReviewField(a,id,key,value);}
function confirm(a,id,{components=[true,true],autonomy='unknown',support=''}={}){
  const op=OPPORTUNITIES.find(o=>o.id===id);if(op.components)components.forEach((v,i)=>field(a,id,`component${i}`,v));
  useOfficeSuggestion(a,id,docs);field(a,id,'autonomy',autonomy);field(a,id,'support',support);confirmOfficeOpportunity(a,id,docs);
}

test('faixas nos limites: 5/12=0, 6/12=1, 11/12=1 e 12/12=2',()=>{
  assert.deepEqual([5,6,11,12].map(scoreBand),[0,1,1,2]);
  const a=completed();assert.equal(objectiveEvidence(a.office,docs,'order').correct,12);
  const order=a.office.stages[1].final.response.order;
  for(const dateValue of ['14/06/2027','16/06/2027']){const indexes=order.map((id,i)=>docs.find(d=>d.id===id).date===dateValue?i:-1).filter(i=>i>=0);[order[indexes[0]],order[indexes[1]]]=[order[indexes[1]],order[indexes[0]]];}
  assert.equal(objectiveEvidence(a.office,docs,'order').score,2,'Empates aceitam qualquer ordem');
});
test('urgências incluem 17/06, contam falsos positivos e negativos; nenhuma marcação vale 0',()=>{
  const a=completed(),state=a.office.stages[2].final.response;assert.equal(objectiveEvidence(a.office,docs,'urgent').correct,12);assert.ok(state.urgent.includes('D06'));assert.ok(!state.urgent.includes('D03'));
  state.urgent.push('D03');assert.equal(objectiveEvidence(a.office,docs,'urgent').score,1);state.urgent=[];const omitted=objectiveEvidence(a.office,docs,'urgent');assert.equal(omitted.correct,6);assert.equal(omitted.score,0);assert.ok(omitted.omitted);
});
test('nova regra exige setores originais e pendentes em Verificar mesmo urgentes',()=>{
  const a=completed(),state=a.office.stages[3].final.response;assert.equal(objectiveEvidence(a.office,docs,'rule').score,2);assert.equal(state.placements.D04,'VERIFICAR');assert.equal(state.placements.D11,'VERIFICAR');
  state.placements.D01='FINANCEIRO';assert.equal(objectiveEvidence(a.office,docs,'rule').correct,11);state.placements.D02='RECEBIDOS';assert.equal(objectiveEvidence(a.office,docs,'rule').correct,10);
});
test('perguntas anteriores bloqueiam a ação; primeira e final de perguntas preservadas no histórico',()=>{
  const a=createAssessment(),s=a.office=createOffice(a.id);submit(s);assert.equal(applyOffice(s,'reorder',{document:officeStage(s).current.order[0],position:11}),false);
  applyOffice(s,'answer',{question:'instructionOrder',value:'Primeira explicação.',mode:'oral'});applyOffice(s,'release-instruction');applyOffice(s,'first');applyOffice(s,'answer',{question:'instructionOrder',value:'Explicação revisada.',mode:'alternative'});applyOffice(s,'complete');
  assert.equal(s.stages[1].first.response.answers.instructionOrder.text,'Primeira explicação.');assert.equal(s.stages[1].final.response.answers.instructionOrder.text,'Explicação revisada.');assert.equal(s.stages[1].final.response.answers.instructionOrder.mode,'alternative');validateOffice(s,a.id);
  const tampered=structuredClone(s);tampered.events.find(e=>e.action==='answer').question='checkUrgency';assert.throws(()=>validateOffice(tampered,a.id));
});
test('sugestão aberta depende de componentes; omissão e componentes parciais',()=>{
  const a=completed();assert.equal(getOfficeEvaluation(a,docs).find(i=>i.op.id==='understand-order').suggestion,null);
  field(a,'understand-order','component0',true);field(a,'understand-order','component1',false);assert.equal(getOfficeEvaluation(a,docs).find(i=>i.op.id==='understand-order').suggestion,1);
  field(a,'understand-order','component0',false);assert.equal(getOfficeEvaluation(a,docs).find(i=>i.op.id==='understand-order').suggestion,0);
  const s=a.office.stages[2].final.response;s.answers.checkUrgency.text='';assert.equal(getOfficeEvaluation(a,docs).find(i=>i.op.id==='check-urgency').suggestion,0);
});
test('notas não entram antes da confirmação; duas oportunidades com pesos iguais',()=>{
  const a=completed(),before=integratedResults(a,discoveryQuestions(content));
  useOfficeSuggestion(a,'urgency',docs);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[2].value,null);
  confirmOfficeOpportunity(a,'urgency',docs);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[2].count,1);
  useOfficeSuggestion(a,'update-rule',docs);field(a,'update-rule','score',1);assert.throws(()=>confirmOfficeOpportunity(a,'update-rule',docs),/Explique/);field(a,'update-rule','reason','Ajuste profissional registrado.');confirmOfficeOpportunity(a,'update-rule',docs);
  const result=officeResults(a,docs,DISCOVERY_DOMAINS)[2];assert.equal(result.value,75);assert.equal(result.count,2);assert.deepEqual(integratedResults(a,discoveryQuestions(content)),before);
  field(a,'urgency','access','Leitor de tela.');assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[2].value,null,'Editar exige nova confirmação');
});
test('apoio e acessibilidade não reduzem nota; ajuda recebida deve ser descrita',()=>{
  const a=completed();useOfficeSuggestion(a,'sequence',docs);field(a,'sequence','autonomy','assisted');assert.throws(()=>confirmOfficeOpportunity(a,'sequence',docs),/apoio/);
  field(a,'sequence','support','Repetição literal da instrução.');field(a,'sequence','access','Ampliação do texto e pausa.');confirmOfficeOpportunity(a,'sequence',docs);assert.equal(a.officeReview.records.sequence.score,2);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[1].value,null);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[1].count,1);
});
test('recusa, interrupção e barreira ficam sem nota e exigem motivo',()=>{
  for(const condition of ['refused','interrupted','barrier']){const a=completed();field(a,'urgency','condition',condition);assert.throws(()=>confirmOfficeOpportunity(a,'urgency',docs),/motivo/);field(a,'urgency','reason','Condição observada documentada.');confirmOfficeOpportunity(a,'urgency',docs);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[2].count,0);validateOfficeReview(a.officeReview,a.office,docs);}
});
test('comunicação pode valer 2 sem decisão administrativa correta; não inventa nota a partir do texto',()=>{
  const a=completed();assert.equal(getOfficeEvaluation(a,docs).find(i=>i.op.id==='communication').suggestion,null);
  field(a,'communication','transcription','Separei D01 por uma decisão que expliquei ao avaliador.');confirm(a,'communication');assert.equal(a.officeReview.records.communication.score,2);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[4].value,null);
  assert.match(officeReviewView(a,docs),/A decisão administrativa pode estar incorreta/);
});
test('importação mantém respostas, revisão e notas; rejeita revisão adulterada',()=>{
  const a=completed();for(const op of OPPORTUNITIES)confirm(a,op.id);assert.deepEqual(validateImport(JSON.parse(JSON.stringify(a)),docs),a);assert.ok(reportView(a,discoveryQuestions(content),docs).includes('Desempenho no Office — entrega final'));assert.ok(reportView(a,discoveryQuestions(content),docs).includes('Dados insuficientes — 1 oportunidade')); 
  const bads=[x=>x.officeReview.matrixVersion='unknown',x=>x.officeReview.evidenceKey='other',x=>x.officeReview.records.urgency.score=1,x=>x.officeReview.records['check-order'].components=[null,true],x=>x.officeReview.records.sequence.autonomy='assisted'];
  for(const mutate of bads){const bad=structuredClone(a);mutate(bad);assert.throws(()=>validateImport(bad,docs));}
});
test('Office 1 preservado: perguntas não aplicadas não recebem respostas ou notas retroativas',()=>{
  const a=completed(),s=a.office;s.version=1;delete s.protocol;
  function legacy(state){delete state.answers;delete state.instructionReleased;}
  for(const stage of s.stages){legacy(stage.initial);legacy(stage.current);legacy(stage.first.response);legacy(stage.final.response);}
  s.events=s.events.filter(e=>!['answer','release-instruction'].includes(e.action));s.events.forEach((e,i)=>{e.sequence=i+1;if(e.after?.order)legacy(e.after);});validateOffice(s,a.id);
  const original=JSON.stringify(s);assert.equal(getOfficeEvaluation(a,docs).filter(i=>i.available).length,4);assert.throws(()=>field(a,'check-order','transcription','Não aplicada.'),/não foi aplicada/);
  confirm(a,'urgency');confirm(a,'update-rule');assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[2].value,100);assert.equal(officeResults(a,docs,DISCOVERY_DOMAINS)[0].count,0);assert.equal(JSON.stringify(s),original);assert.ok(validateImport(a,docs));
});
