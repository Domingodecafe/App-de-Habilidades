import {OPPORTUNITIES,MATRIX_VERSION,MODALITIES} from './office-protocol.js';
const CONDITIONS=['pending','observed','refused','interrupted','barrier'];
const AUTONOMY=['unknown','independent','assisted'];
const evidenceKey=session=>JSON.stringify({version:session.version,final:session.stages.map(s=>s.final)});
export const scoreBand=correct=>correct<6?0:correct<12?1:2;
const dateKey=date=>date.split('/').reverse().join('-');
export function objectiveEvidence(session,docs,type){
  const stage={classification:1,order:2,urgent:3,rule:4}[type],state=session?.stages[stage-1]?.final?.response;
  if(!state)return null;
  let correct=0;
  if(type==='order'){
    const dates=docs.map(d=>dateKey(d.date)).sort();
    correct=state.order.filter((id,i)=>dateKey(docs.find(d=>d.id===id).date)===dates[i]).length;
  }else correct=docs.filter(d=>type==='urgent'?state.urgent.includes(d.id)===(dateKey(d.date)<='2027-06-17'):state.placements[d.id]===(type==='rule'&&d.status==='PENDENTE'?'VERIFICAR':d.sector)).length;
  const omitted=type==='urgent'&&state.urgent.length===0;
  return {correct,total:12,percent:correct/12*100,score:omitted?0:scoreBand(correct),omitted};
}
export function blankOfficeReview(session){return {matrixVersion:MATRIX_VERSION,protocolVersion:session.version,evidenceKey:evidenceKey(session),records:{}};}
export function blankOfficeReviewRecord(){return {condition:'pending',score:null,components:[null,null],reason:'',support:'',access:'',autonomy:'unknown',transcription:'',modality:'written',confirmedAt:null};}
export function officeOpportunity(session,op,record=blankOfficeReviewRecord(),docs){
  const response=session?.stages[op.stage-1]?.final?.response;
  const available=!!response&&(!op.question||session.version===2&&Object.hasOwn(response.answers,op.question));
  const answer=op.question?response?.answers?.[op.question]:op.type==='message'?{text:response?.text||'',mode:'written'}:null;
  const text=record.transcription.trim()||answer?.text||'';
  const objective=available&&op.criterion?objectiveEvidence(session,docs,op.type):null;
  const suggestion=!available?null:objective?objective.score:!text.trim()?0:record.components.every(v=>typeof v==='boolean')?record.components.filter(Boolean).length:null;
  return {op,record,response,available,answer,text,objective,suggestion};
}
export function getOfficeEvaluation(assessment,docs){
  const session=assessment.office,review=assessment.officeReview;
  const current=!!session&&!!review&&review.matrixVersion===MATRIX_VERSION&&review.evidenceKey===evidenceKey(session);
  return OPPORTUNITIES.map(op=>officeOpportunity(session,op,current?review.records[op.id]||blankOfficeReviewRecord():blankOfficeReviewRecord(),docs));
}
export function officeResults(assessment,docs,domains){
  const items=getOfficeEvaluation(assessment,docs);
  return domains.map((name,domain)=>{const opportunities=items.filter(i=>i.op.domain===domain),confirmed=opportunities.filter(i=>i.available&&i.record.confirmedAt&&i.record.condition==='observed'&&[0,1,2].includes(i.record.score));
    return {name,domain,count:confirmed.length,total:opportunities.length,available:opportunities.filter(i=>i.available).length,value:confirmed.length>=2?Math.round(confirmed.reduce((sum,i)=>sum+i.record.score,0)/confirmed.length*50*100)/100:null};
  });
}
export function setOfficeReviewField(assessment,id,key,value){
  const op=OPPORTUNITIES.find(op=>op.id===id),session=assessment.office;
  if(session?.status!=='completed'||!op)throw Error('Conclua o Office antes de revisar.');
  const response=session.stages[op.stage-1]?.final?.response;
  if(!response||op.question&&(session.version!==2||!Object.hasOwn(response.answers,op.question)))throw Error('Esta oportunidade não foi aplicada.');
  assessment.officeReview ||= blankOfficeReview(assessment.office);
  if(assessment.officeReview.evidenceKey!==evidenceKey(assessment.office))throw Error('A evidência mudou. A revisão precisa ser refeita.');
  const record=assessment.officeReview.records[id] ||= blankOfficeReviewRecord();
  if(/^component[01]$/.test(key))record.components[Number(key.at(-1))]=value;
  else if(Object.hasOwn(record,key)&&key!=='confirmedAt'&&key!=='components')record[key]=value;
  else throw Error('Campo de revisão inválido.');
  record.confirmedAt=null;return record;
}
function confirmationError(item){
  const {record:r,available,op,suggestion,text}=item;
  if(!available)return 'Esta oportunidade não foi aplicada ou não tem entrega final.';
  if(!CONDITIONS.includes(r.condition)||r.condition==='pending')return 'Registre a condição de observação.';
  if(r.condition!=='observed')return r.reason.trim()?null:'Registre o motivo de não observação.';
  if(![0,1,2].includes(r.score))return 'Escolha uma nota de 0 a 2.';
  if(op.components&&!r.components.every(v=>typeof v==='boolean'))return 'Classifique os dois componentes da resposta.';
  if(op.components&&!text.trim()&&r.components.some(Boolean))return 'Registre a resposta ou transcrição que demonstra os componentes.';
  if(r.score!==suggestion&&!r.reason.trim())return 'Explique o ajuste em relação à nota sugerida.';
  if(r.autonomy==='assisted'&&!r.support.trim())return 'Descreva o apoio recebido.';
  return null;
}
export function confirmOfficeOpportunity(assessment,id,docs,at=new Date().toISOString()){
  if(assessment.office?.status!=='completed')throw Error('Conclua o Office antes de revisar.');
  const item=getOfficeEvaluation(assessment,docs).find(i=>i.op.id===id);if(!item)throw Error('Oportunidade desconhecida.');
  const error=confirmationError(item);if(error)throw Error(error);
  assessment.officeReview.records[id].confirmedAt=at;
  return assessment.officeReview.records[id];
}
export function useOfficeSuggestion(assessment,id,docs){
  const item=getOfficeEvaluation(assessment,docs).find(i=>i.op.id===id);
  if(!item?.available||item.suggestion===null)throw Error('Classifique os componentes para obter a sugestão.');
  const record=setOfficeReviewField(assessment,id,'score',item.suggestion);record.condition='observed';
  if(item.op.components&&!item.text.trim())record.components=[false,false];return record;
}
export function validateOfficeReview(review,session,docs){
  const fail=()=>{throw Error('Revisão do Office inválida.');};
  if(!session||session.status!=='completed'||!review||review.matrixVersion!==MATRIX_VERSION||review.protocolVersion!==session.version||review.evidenceKey!==evidenceKey(session)||!review.records||typeof review.records!=='object'||Array.isArray(review.records))fail();
  for(const [id,r] of Object.entries(review.records)){
    const op=OPPORTUNITIES.find(o=>o.id===id);
    if(!op||!r||!CONDITIONS.includes(r.condition)||![null,0,1,2].includes(r.score)||!Array.isArray(r.components)||r.components.length!==2||r.components.some(v=>![null,true,false].includes(v))||!['reason','support','access','transcription'].every(k=>typeof r[k]==='string')||!AUTONOMY.includes(r.autonomy)||!Object.hasOwn(MODALITIES,r.modality)||r.confirmedAt!==null&&(typeof r.confirmedAt!=='string'||!Number.isFinite(Date.parse(r.confirmedAt))))fail();
    const response=session.stages[op.stage-1]?.final?.response;
    if(r.confirmedAt&&(!response||op.question&&(session.version!==2||!Object.hasOwn(response.answers,op.question))))fail();
    if(r.confirmedAt){if(r.condition==='pending'||r.condition!=='observed'&&!r.reason.trim()||r.condition==='observed'&&(![0,1,2].includes(r.score)||op.components&&!r.components.every(v=>typeof v==='boolean')||r.autonomy==='assisted'&&!r.support.trim()))fail();}
    if(r.confirmedAt&&docs&&confirmationError(officeOpportunity(session,op,r,docs)))fail();
  }
  return review;
}
