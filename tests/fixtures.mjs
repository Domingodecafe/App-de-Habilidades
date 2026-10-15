import {createAssessment} from '../core.js';
import {discoveryQuestions,blankRecord} from '../integrated.js';
import {createOffice,applyOffice,officeStage} from '../office.js';
import {stageQuestions} from '../office-protocol.js';
import {ensureAccompanied,confirmDiscoveryDecision,prepareOfficeReview} from '../accompanied.js';
import {getOfficeEvaluation,setOfficeReviewField,useOfficeSuggestion,confirmOfficeOpportunity} from '../office-evaluation.js';
export function completedFixture(content,docs,{message='Encaminhei D04 e D11 para Verificar porque estavam pendentes.'}={}){
 const a=createAssessment();a.identity.code='BENCHMARK · fictício';a.identity.professional='Avaliador fictício';a.identity.agreement=true;ensureAccompanied(a);
 for(const q of discoveryQuestions(content)){a.integrated.records[q.id]={...blankRecord(),answer:'Organizo os documentos por prazo e confiro as informações antes de comunicar o resultado.',score:q.domain===null?null:2};if(q.domain!==null)confirmDiscoveryDecision(a,q,'classified');}
 const s=a.office=createOffice(a.id,{demo:true,random:()=>.4});
 const act=(action,payload)=>applyOffice(s,action,payload,{random:()=>.4});
 while(s.status==='active'){
  for(const [question] of stageQuestions(s.currentStage))act('answer',{question,value:'Resposta fictícia: comparo os prazos e sigo a regra da etapa.',mode:'written'});
  if(!officeStage(s).current.instructionReleased)act('release-instruction');
  act('help');act('pause');act('resume');
  if([1,4].includes(s.currentStage))for(const d of docs){act('move',{document:d.id,destination:'RH'});act('move',{document:d.id,destination:s.currentStage===4&&d.status==='PENDENTE'?'VERIFICAR':d.sector});}
  if(s.currentStage===2)docs.toSorted((a,b)=>a.date.split('/').reverse().join('-').localeCompare(b.date.split('/').reverse().join('-'))).forEach((d,position)=>act('reorder',{document:d.id,position}));
  if(s.currentStage===3)for(const d of docs){act('urgent',{document:d.id,value:true});act('urgent',{document:d.id,value:d.date.split('/').reverse().join('-')<='2027-06-17'});}
  if(s.currentStage===5)act('text',{value:'Separei os documentos para conferência.'});
  act('first');
  if(s.currentStage===5)act('text',{value:message});
  act('complete');
 }
 prepareOfficeReview(a,docs);
 for(const item of getOfficeEvaluation(a,docs)){if(item.op.components){setOfficeReviewField(a,item.op.id,'component0',true);setOfficeReviewField(a,item.op.id,'component1',true);}useOfficeSuggestion(a,item.op.id,docs);confirmOfficeOpportunity(a,item.op.id,docs);}
 a.external.phase='done';a.assisted.completedAt=new Date().toISOString();a.status='revisado';return a;
}
