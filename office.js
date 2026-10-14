// Immutable task evidence. Scoring and professional review live in office-evaluation.js.
import {stageQuestions,MODALITIES} from './office-protocol.js';
export const OFFICE_VERSION=2;
export const DOCUMENT_IDS=Array.from({length:12},(_,i)=>`D${String(i+1).padStart(2,'0')}`);
export const OFFICE_STEPS=['Classificar documentos','Ordenar por prazo','Identificar urgências','Mudança de regra','Comunicação final'];
export const INBOX='RECEBIDOS';
export const FOLDERS=[INBOX,'RH','FINANCEIRO','OPERAÇÕES'];
export const ADAPTATION='Setor oculto na classificação; etapas com lotes neutros; ordenação em lista única.';
const copy=value=>structuredClone(value);
const now=()=>new Date().toISOString();
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function shuffled(random=Math.random){const ids=[...DOCUMENT_IDS];for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids;}
function initialState(step,random,version){return {...(version===2?{answers:Object.fromEntries(stageQuestions(step).map(([id])=>[id,{text:'',mode:'written'}])),instructionReleased:![2,4].includes(step)}:{}),order:step===5?[]:shuffled(random),placements:step===1||step===4?Object.fromEntries(DOCUMENT_IDS.map(id=>[id,INBOX])):{},urgent:[],text:''};}
function log(session,action,details={},at=now()){session.events.push({sequence:session.events.length+1,at,stage:session.currentStage,document:null,origin:null,destination:null,before:null,after:null,action,...copy(details)});session.updatedAt=at;}
function startStage(session,random,at){const state=initialState(session.currentStage,random,session.version);session.stages.push({step:session.currentStage,initial:copy(state),current:state,first:null,final:null,startedAt:at,completedAt:null});log(session,'stage-start',{after:state},at);}
export function createOffice(assessmentId,{demo=false,random=Math.random,at=now()}={}){const session={version:OFFICE_VERSION,protocol:'office-2',assessmentId,adaptation:ADAPTATION,scenarioDate:'15/06/2027',demo,currentStage:1,status:'active',createdAt:at,updatedAt:at,stages:[],events:[]};startStage(session,random,at);return session;}
export function officeStage(session){return session.stages[session.currentStage-1];}
export function officeIncomplete(session){const s=officeStage(session).current;if(session.currentStage===1||session.currentStage===4)return Object.values(s.placements).some(v=>v===INBOX);if(session.currentStage===3)return s.urgent.length===0;if(session.currentStage===5)return !s.text.trim();return false;}
export function applyOffice(session,action,payload={}, {at=now(),random=Math.random}={}){
  const stage=officeStage(session),state=stage.current,step=session.currentStage;
  if(action==='resume'){if(session.status!=='paused')return false;session.status='active';log(session,action,{},at);return true;}
  if(session.status!=='active')return false;
  if(action==='pause'||action==='help'){if(action==='pause')session.status='paused';log(session,action,{reason:payload.reason||'participant'},at);return true;}
  if(stage.final)return false;
  if(session.version===2&&!state.instructionReleased&&['move','reorder','urgent','first','complete'].includes(action))return false;
  if(action==='answer'){
    const {question,value,mode}=payload;if(session.version!==2||!Object.hasOwn(state.answers,question)||typeof value!=='string'||!Object.hasOwn(MODALITIES,mode))return false;
    const before=copy(state.answers[question]),after={text:value,mode};if(equal(before,after))return false;state.answers[question]=after;log(session,action,{question,before,after},at);return true;
  }
  if(action==='release-instruction'){if(session.version!==2||state.instructionReleased)return false;state.instructionReleased=true;log(session,action,{before:false,after:true},at);return true;}
  if(action==='move'){
    const {document:id,destination}=payload,allowed=step===4?[...FOLDERS,'VERIFICAR']:FOLDERS;
    if(![1,4].includes(step)||!DOCUMENT_IDS.includes(id)||!allowed.includes(destination))return false;
    const origin=state.placements[id];if(origin===destination)return false;
    const from=state.order.filter(d=>state.placements[d]===origin).indexOf(id);
    state.order=state.order.filter(d=>d!==id);state.order.push(id);state.placements[id]=destination;
    const to=state.order.filter(d=>state.placements[d]===destination).indexOf(id);
    log(session,action,{document:id,origin,destination,fromPosition:from,toPosition:to,before:origin,after:destination},at);
  }else if(action==='reorder'){
    const {document:id,position}=payload,from=state.order.indexOf(id);
    if(step!==2||from<0||!Number.isInteger(position)||position<0||position>=12||from===position)return false;
    const before=copy(state.order);state.order.splice(from,1);state.order.splice(position,0,id);
    log(session,action,{document:id,origin:'LISTA',destination:'LISTA',fromPosition:from,toPosition:position,before,after:state.order},at);
  }else if(action==='urgent'){
    const id=payload.document;if(step!==3||!DOCUMENT_IDS.includes(id)||typeof payload.value!=='boolean')return false;
    const before=state.urgent.includes(id);if(before===payload.value)return false;
    state.urgent=state.urgent.filter(d=>d!==id);if(payload.value)state.urgent.push(id);
    log(session,action,{document:id,before,after:payload.value},at);
  }else if(action==='text'){
    if(step!==5||typeof payload.value!=='string'||state.text===payload.value)return false;
    const before=state.text;state.text=payload.value;log(session,action,{before,after:state.text},at);
  }else if(action==='first'){
    if(stage.first)return false;stage.first={at,response:copy(state)};log(session,action,{after:state},at);
  }else if(action==='complete'){
    if(!stage.first)return false;stage.final={at,response:copy(state)};stage.completedAt=at;log(session,action,{after:state},at);
    if(step===5){session.status='completed';log(session,'activity-complete',{},at);}else{session.currentStage++;startStage(session,random,at);}
  }else return false;
  return true;
}
export function getOfficeRecords(assessment){return assessment.office?copy(assessment.office):null;}
export function exportOfficeJSON(assessment){return JSON.stringify(getOfficeRecords(assessment),null,2);}

export function validateOffice(session,assessmentId){
  const fail=()=>{throw Error('Registros do Escritório Digital inválidos.');};
  const date=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
  if(!session||![1,2].includes(session.version)||(session.version===2&&session.protocol!=='office-2')||session.assessmentId!==assessmentId||session.adaptation!==ADAPTATION||session.scenarioDate!=='15/06/2027'||typeof session.demo!=='boolean'||!['active','paused','completed'].includes(session.status)||!Number.isInteger(session.currentStage)||session.currentStage<1||session.currentStage>5||!date(session.createdAt)||!date(session.updatedAt)||!Array.isArray(session.stages)||session.stages.length!==session.currentStage||!Array.isArray(session.events)||!session.events.length)fail();
  const permutation=ids=>Array.isArray(ids)&&ids.length===12&&new Set(ids).size===12&&ids.every(id=>DOCUMENT_IDS.includes(id));
  function checkState(s,step){
    if(!s||!Array.isArray(s.order)||(step===5?s.order.length!==0:!permutation(s.order))||!s.placements||typeof s.placements!=='object'||Array.isArray(s.placements)||!Array.isArray(s.urgent)||new Set(s.urgent).size!==s.urgent.length||!s.urgent.every(id=>DOCUMENT_IDS.includes(id))||typeof s.text!=='string')fail();
    if([1,4].includes(step)){if(!permutation(Object.keys(s.placements))||Object.values(s.placements).some(v=>!(step===4?[...FOLDERS,'VERIFICAR']:FOLDERS).includes(v)))fail();}else if(Object.keys(s.placements).length)fail();
    if(step!==3&&s.urgent.length||step!==5&&s.text!=='')fail();
    if(session.version===2){const ids=stageQuestions(step).map(([id])=>id);if(!s.answers||Array.isArray(s.answers)||!equal(Object.keys(s.answers).sort(),ids.sort())||typeof s.instructionReleased!=='boolean'||(![2,4].includes(step)&&!s.instructionReleased))fail();for(const value of Object.values(s.answers))if(!value||typeof value.text!=='string'||!Object.hasOwn(MODALITIES,value.mode))fail();}
    else if(s.answers!==undefined||s.instructionReleased!==undefined)fail();
  }
  for(const [i,s] of session.stages.entries()){
    const step=i+1;if(s.step!==step||!date(s.startedAt))fail();checkState(s.initial,step);checkState(s.current,step);
    if(s.initial.urgent.length||s.initial.text||Object.values(s.initial.placements).some(v=>v!==INBOX))fail();
    if(session.version===2&&(s.initial.instructionReleased!==![2,4].includes(step)||Object.values(s.initial.answers).some(v=>v.text!==''||v.mode!=='written')))fail();
    for(const snapshot of [s.first,s.final])if(snapshot!==null){if(!snapshot||!date(snapshot.at))fail();checkState(snapshot.response,step);}
    if(s.final&&(!s.first||!date(s.completedAt)||s.completedAt!==s.final.at||!equal(s.final.response,s.current)))fail();
    if(!s.final&&s.completedAt!==null||step<session.currentStage&&!s.final)fail();
  }
  if((session.status==='completed')!==!!session.stages.at(-1).final)fail();
  // Replay actions against saved initial stimuli; prevents inconsistent imports.
  const replay={...copy(session),currentStage:1,status:'active',stages:[],events:[]};
  let nextStage=1;
  for(const [i,event] of session.events.entries()){
    if(!event||event.sequence!==i+1||!date(event.at)||event.stage!==nextStage||!Object.hasOwn(event,'document')||!Object.hasOwn(event,'before')||!Object.hasOwn(event,'after'))fail();
    if(event.action==='stage-start'){
      const source=session.stages[nextStage-1];if(!source||replay.stages.length!==nextStage-1||!equal(event.after,source.initial)||event.at!==source.startedAt)fail();
      replay.currentStage=nextStage;replay.stages.push({...copy(source),current:copy(source.initial),first:null,final:null,completedAt:null});
    }else if(event.action==='activity-complete'){
      if(nextStage!==5||!replay.stages[4].final||i!==session.events.length-1)fail();replay.status='completed';
    }else if(event.action==='complete'){
      const s=officeStage(replay);if(replay.status!=='active'||!s.first||s.final||(session.version===2&&!s.current.instructionReleased)||!equal(event.after,s.current))fail();s.final={at:event.at,response:copy(s.current)};s.completedAt=event.at;if(nextStage<5)nextStage++;
    }else{
      if(replay.stages.length!==nextStage)fail();
      const payload={document:event.document,destination:event.destination,position:event.toPosition,value:event.after,reason:event.reason,question:event.question,mode:event.after?.mode};if(event.action==='answer')payload.value=event.after?.text;
      if(!applyOffice(replay,event.action,payload,{at:event.at}))fail();
      const generated=replay.events.at(-1);for(const key of ['document','origin','destination','before','after','fromPosition','toPosition','question'])if(!equal(generated[key],event[key]))fail();
    }
  }
  if(replay.status!==session.status||nextStage!==session.currentStage)fail();
  for(let i=0;i<session.stages.length;i++)for(const key of ['current','first','final','completedAt'])if(!equal(session.stages[i][key],replay.stages[i]?.[key]))fail();
  if(session.updatedAt!==session.events.at(-1).at)fail();return session;
}
