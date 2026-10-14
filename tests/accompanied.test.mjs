import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAssessment,validateImport} from '../core.js';
import {blankRecord,discoveryQuestions,integratedResults} from '../integrated.js';
import {createOffice,applyOffice,officeStage} from '../office.js';
import {useOfficeSuggestion,confirmOfficeOpportunity,getOfficeEvaluation} from '../office-evaluation.js';
import {ensureAccompanied,confirmDiscoveryDecision,discoveryDecided,invalidateDiscoveryDecision,prepareOfficeReview,accompaniedCompletion} from '../accompanied.js';
import {officeView} from '../office-view.js';
const content=JSON.parse(fs.readFileSync(new URL('../data/content.json',import.meta.url))),docs=JSON.parse(fs.readFileSync(new URL('../data/games.json',import.meta.url))).docs,qs=discoveryQuestions(content);
test('radar acompanhado exclui propostas e decisões invalidadas; legado permanece compatível',()=>{
 const a=createAssessment(),items=qs.filter(q=>q.domain===0);
 for(const q of items)a.integrated.records[q.id]={...blankRecord(),answer:'Evidência',score:2};
 assert.equal(integratedResults(a,qs)[0].interview,100);
 ensureAccompanied(a);assert.equal(integratedResults(a,qs)[0].interview,null);
 for(const q of items)confirmDiscoveryDecision(a,q,'classified');
 assert.equal(integratedResults(a,qs)[0].interview,100);
 a.integrated.records[items[0].id].help='Apoio revisado';assert.equal(integratedResults(a,qs)[0].interview,null);
});
test('importação rejeita progresso externo inválido sem modificar o original',()=>{
 const a=createAssessment();ensureAccompanied(a);const original=structuredClone(a);
 for(const patch of [{phase:'inexistente'},{questionIndex:28},{questionIndex:-1},{questionIndex:0.5},{version:9},{phase:'office'},{phase:'done'}]){
  const bad=structuredClone(a);Object.assign(bad.external,patch);assert.throws(()=>validateImport(bad,docs));
 }
 assert.deepEqual(a,original);assert.deepEqual(validateImport(a,docs),a);
});
test('decisão não observada inconsistente não libera conclusão ou pontuação',()=>{
 const a=createAssessment(),q=qs.find(q=>q.domain===0);ensureAccompanied(a);
 a.integrated.records[q.id]={...blankRecord(),answer:'Resposta',score:2};confirmDiscoveryDecision(a,q,'classified');
 a.assisted.discoveryReviews[q.id].decision='notObserved';assert.equal(discoveryDecided(a,q.id),false);
});
function fixture(){const a=createAssessment();ensureAccompanied(a);a.identity.professional='Avaliador fictício';for(const q of qs.filter(q=>q.domain!==null)){a.integrated.records[q.id]={...blankRecord(),answer:'Resposta fictícia.',score:1};confirmDiscoveryDecision(a,q,'classified');}a.office=createOffice(a.id);while(a.office.status==='active'){if(officeStage(a.office).current.instructionReleased===false)applyOffice(a.office,'release-instruction');applyOffice(a.office,'first');applyOffice(a.office,'complete');}return a;}
test('decisão Discovery exige nota válida ou ausência justificada; edição invalida',()=>{
 const a=createAssessment(),q=qs.find(q=>q.domain===0);ensureAccompanied(a);a.integrated.records[q.id]=blankRecord();assert.throws(()=>confirmDiscoveryDecision(a,q,'classified'),/resposta/);assert.throws(()=>confirmDiscoveryDecision(a,q,'notObserved'),/motivo/);
 a.integrated.records[q.id].reason='Oportunidade interrompida.';confirmDiscoveryDecision(a,q,'notObserved');assert.ok(discoveryDecided(a,q.id));assert.equal(a.integrated.records[q.id].score,null);
 a.integrated.records[q.id].answer='Resposta agora registrada.';assert.equal(discoveryDecided(a,q.id),false);invalidateDiscoveryDecision(a,q.id);a.integrated.records[q.id].score=1;confirmDiscoveryDecision(a,q,'classified');assert.ok(discoveryDecided(a,q.id));a.integrated.records[q.id].help='Novo apoio.';assert.equal(discoveryDecided(a,q.id),false);
 assert.throws(()=>confirmDiscoveryDecision(a,qs.find(q=>q.domain===null),'classified'),/descritiva/);
});
test('finalização exige todas as decisões, mas permite ausência justificada sem impor zero',()=>{
 const a=fixture();assert.equal(accompaniedCompletion(a,qs,docs).ready,false);prepareOfficeReview(a,docs);
 for(const item of getOfficeEvaluation(a,docs)){useOfficeSuggestion(a,item.op.id,docs);confirmOfficeOpportunity(a,item.op.id,docs);}
 assert.ok(accompaniedCompletion(a,qs,docs).ready);const q=qs.find(q=>q.domain!==null);a.integrated.records[q.id].reason='Barreira impeditiva.';confirmDiscoveryDecision(a,q,'notObserved');assert.ok(accompaniedCompletion(a,qs,docs).ready);assert.equal(a.integrated.records[q.id].score,null);
 a.identity.professional='';assert.equal(accompaniedCompletion(a,qs,docs).ready,false);a.identity.professional='Avaliador';assert.ok(validateImport(a,docs));
});
test('apoios por etapa são copiados uma vez para revisão sem gerar notas',()=>{
 const a=fixture();a.assisted.officeObservations[2]={support:'Repetição literal.',access:'Texto ampliado.',notes:'Observação preservada.',autonomy:'assisted'};prepareOfficeReview(a,docs);
 for(const id of ['sequence','understand-order','check-order']){assert.equal(a.officeReview.records[id].support,'Repetição literal.');assert.equal(a.officeReview.records[id].score,null);assert.equal(a.officeReview.records[id].confirmedAt,null);}
 a.officeReview.records.sequence.support='Correção do avaliador.';prepareOfficeReview(a,docs);assert.equal(a.officeReview.records.sequence.support,'Correção do avaliador.');assert.ok(validateImport(a,docs));
});
test('fluxo antigo preserva Office, classificações e dados; apenas passa à revisão',()=>{
 const a=fixture();delete a.assisted;a.external={version:1,phase:'done',questionIndex:27};const office=JSON.stringify(a.office),records=JSON.stringify(a.integrated.records);ensureAccompanied(a);assert.equal(a.external.version,2);assert.equal(a.external.phase,'review');assert.equal(JSON.stringify(a.office),office);assert.equal(JSON.stringify(a.integrated.records),records);assert.deepEqual(a.assisted.discoveryReviews,{});
 const bad=structuredClone(a);bad.assisted.officeObservations[8]={};assert.throws(()=>validateImport(bad,docs));
});
test('destinos reais, origem sem drop e devolução explicitamente registrada',()=>{
 const a=createAssessment();a.office=createOffice(a.id);let html=officeView(a,docs);assert.equal((html.match(/class="office-drop-target"/g)||[]).length,3);assert.ok(!html.includes('data-folder="RECEBIDOS"'));assert.ok(html.includes('class="office-source"'));assert.ok(html.includes('Escolher destino'));
 applyOffice(a.office,'move',{document:'D01',destination:'RH'});html=officeView(a,docs);assert.ok(html.includes('Devolver à lista inicial'));applyOffice(a.office,'move',{document:'D01',destination:'RECEBIDOS'});assert.equal(a.office.events.at(-1).destination,'RECEBIDOS');
 while(a.office.currentStage<4){if(officeStage(a.office).current.instructionReleased===false)applyOffice(a.office,'release-instruction');applyOffice(a.office,'first');applyOffice(a.office,'complete');}applyOffice(a.office,'release-instruction');html=officeView(a,docs);assert.equal((html.match(/class="office-drop-target"/g)||[]).length,4);assert.ok(html.includes('data-folder="VERIFICAR"'));
});
