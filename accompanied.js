import {blankRecord} from './integrated.js';
import {blankOfficeReview,getOfficeEvaluation,setOfficeReviewField} from './office-evaluation.js';
import {discoveryFingerprint as fingerprint,discoveryDecided} from './discovery-decision.js';
export {discoveryDecided} from './discovery-decision.js';
export function ensureAccompanied(a){
  a.assisted ||= {version:1,discoveryReviews:{},officeObservations:{},officePrepared:false,completedAt:null};
  a.external ||= {version:2,phase:'welcome',questionIndex:0};
  if(a.external.version===1){a.external.previousVersion=1;a.external.version=2;if(a.external.phase==='done')a.external.phase='review';}
  return a.assisted;
}
export function invalidateDiscoveryDecision(a,id){ensureAccompanied(a);delete a.assisted.discoveryReviews[id];a.assisted.completedAt=null;}
export function confirmDiscoveryDecision(a,q,decision,at=new Date().toISOString()){
  if(q.domain===null)throw Error('Esta pergunta é descritiva e não recebe nota.');
  const r=a.integrated.records[q.id] ||= blankRecord();
  if(decision==='classified'){
    if(!r.answer.trim())throw Error('Registre a resposta antes de classificar.');
    if(![0,1,2].includes(r.score))throw Error('Escolha uma nota de 0 a 2.');
    if(r.independence==='assisted'&&!r.help.trim())throw Error('Descreva a ajuda recebida.');
    r.first ||= {answer:r.answer,help:r.help,access:r.access,at};
  }else if(decision==='notObserved'){if(!r.reason.trim())throw Error('Registre o motivo de ausência de classificação.');r.score=null;}
  else throw Error('Decisão desconhecida.');
  ensureAccompanied(a);a.assisted.discoveryReviews[q.id]={decision,fingerprint:fingerprint(r),at};a.assisted.completedAt=null;
}
export function prepareOfficeReview(a,docs){
  const flow=ensureAccompanied(a);if(flow.officePrepared||a.office?.status!=='completed')return;
  a.officeReview ||= blankOfficeReview(a.office);
  for(const item of getOfficeEvaluation(a,docs)){
    const obs=flow.officeObservations[item.op.stage];if(!item.available||!obs||a.officeReview.records[item.op.id])continue;
    for(const key of ['support','access','autonomy'])setOfficeReviewField(a,item.op.id,key,obs[key]);
  }
  flow.officePrepared=true;
}
export function accompaniedCompletion(a,qs,docs){
  const missingDiscovery=qs.filter(q=>q.domain!==null&&!discoveryDecided(a,q.id));
  const missingOffice=getOfficeEvaluation(a,docs).filter(i=>i.available&&!i.record.confirmedAt);
  return {ready:!!a.identity.professional.trim()&&a.office?.status==='completed'&&missingDiscovery.length===0&&missingOffice.length===0,missingDiscovery,missingOffice};
}
export function validateAccompanied(a){
  const s=a.assisted,object=v=>v&&typeof v==='object'&&!Array.isArray(v),date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
  const fail=()=>{throw Error('Registro da aplicação acompanhada inválido.');};
  if(a.external!==undefined){
    const f=a.external;
    if(!object(f)||![1,2].includes(f.version)||!['welcome','discovery','office-ready','office','review','done'].includes(f.phase)||!Number.isInteger(f.questionIndex)||f.questionIndex<0||f.questionIndex>27)fail();
    if(['office','review','done'].includes(f.phase)&&!a.office)fail();
    if(['review','done'].includes(f.phase)&&a.office.status!=='completed')fail();
  }
  if(s===undefined)return;
  if(!object(s)||s.version!==1||!object(s.discoveryReviews)||!object(s.officeObservations)||typeof s.officePrepared!=='boolean'||s.completedAt!==null&&!date(s.completedAt))fail();
  for(const [id,r] of Object.entries(s.discoveryReviews))if(!/^D\d\d$/.test(id)||!a.integrated.records[id]||!object(r)||!['classified','notObserved'].includes(r.decision)||typeof r.fingerprint!=='string'||!date(r.at))fail();
  for(const [step,o] of Object.entries(s.officeObservations))if(!/^[1-5]$/.test(step)||!object(o)||!['support','access','notes'].every(k=>typeof o[k]==='string')||!['unknown','independent','assisted'].includes(o.autonomy))fail();
}
