import {validateOfficeReview} from './office-evaluation.js';
import {validateOffice} from './office.js';
import {blankIntegrated,validateIntegrated,migrateIntegrated} from './integrated.js';
export const SCHEMA=4;
export const QUALIFIERS={none:{label:'Não se aplica',points:0},partial:{label:'Aplica-se em partes',points:50},complete:{label:'Aplica-se completamente',points:100}};
export function createAssessment(){return {schema:SCHEMA,id:globalThis.crypto.randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),protocol:'Entrevista Discovery 0.4',integrated:blankIntegrated(),identity:{code:'',age:'',date:new Date().toLocaleDateString('en-CA'),professional:'',communication:'',notes:'',agreement:false},discovery:{preRegistrationComplete:false,lastQuestion:0},interview:{},verbal:{},practical:{},matrixReviewed:false,report:{},status:'rascunho'};}
export function discoveryResults(assessment,content){return content.blocks.map((name,block)=>{const questions=content.interview.filter(q=>q.block===block);const classified=questions.map(q=>assessment.interview[q.id]?.qualifier).filter(value=>Object.hasOwn(QUALIFIERS,value));return {name,block,count:classified.length,total:questions.length,value:classified.length>=2?Math.round(classified.reduce((sum,key)=>sum+QUALIFIERS[key].points,0)/classified.length*100)/100:null};});}
export function validRecord(r){return !!r && (r.status==='observado') && typeof r.correct==='boolean' && typeof r.independent==='boolean';}
export function coefficient(records,min=2){const valid=records.filter(validRecord);return {value:valid.length>=min?Math.round(valid.filter(r=>r.correct&&r.independent).length/valid.length*10000)/100:null,count:valid.length,independentCorrect:valid.filter(r=>r.correct&&r.independent).length,no:records.filter(r=>r?.status==='NO').length};}
export function results(assessment,content,matrix){return content.axes.map((name,axis)=>{const verbal=coefficient(content.probes.filter(p=>p.axis===axis).map(p=>assessment.verbal[p.id]));const practical=coefficient(matrix.filter(p=>p.axis===axis).map(p=>assessment.matrixReviewed?assessment.practical[p.id]?.review:undefined));return {name,axis,verbal,practical,integrated:verbal.value!==null&&practical.value!==null?Math.round((verbal.value+practical.value)/2*100)/100:null};});}
export function median(values){const n=values.filter(v=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);return {value:n.length?(n.length%2?n[(n.length-1)/2]:(n[n.length/2-1]+n[n.length/2])/2):null,count:n.length};}
export function validateImport(input,officeDocs){
  if(!input||![1,2,3,SCHEMA].includes(input.schema))throw new Error('Arquivo incompatível com esta versão.');
  const a=structuredClone(input);
  if(a.schema===1){a.schema=SCHEMA;a.discovery={preRegistrationComplete:false,lastQuestion:0};if(a.interview&&typeof a.interview==='object')for(const r of Object.values(a.interview))if(r&&typeof r==='object'){r.qualifier=null;r.evidenceIds=[];}}
  if(input.schema<3){a.schema=SCHEMA;a.integrated=blankIntegrated();}
  if(input.schema===3){a.integrated=migrateIntegrated(a.integrated);a.schema=SCHEMA;}
  if(input.schema<SCHEMA){a.previousProtocol=a.protocol;a.protocol='Entrevista Discovery 0.4';a.status='rascunho';}
  validateIntegrated(a.integrated);
  if(a.integrated.version!=='discovery-0.4')throw new Error('Versão de entrevista incompatível.');
  if(typeof a.id!=='string'||!a.id||!isObject(a.identity)||!isObject(a.interview)||!isObject(a.verbal)||!isObject(a.practical)||!isObject(a.report))throw new Error('Arquivo incompatível com esta versão.');
  if(typeof a.matrixReviewed!=='boolean'||!['rascunho','revisado'].includes(a.status)||typeof a.protocol!=='string')throw new Error('Revisão ou versão inválida.');
  for(const key of ['code','age','date','professional','communication','notes'])if(typeof a.identity[key]!=='string')throw new Error('Identificação inválida.');
  if(typeof a.identity.agreement!=='boolean')throw new Error('Concordância inválida.');
  if(!isObject(a.discovery)||typeof a.discovery.preRegistrationComplete!=='boolean'||!Number.isInteger(a.discovery.lastQuestion)||a.discovery.lastQuestion<0||a.discovery.lastQuestion>35)throw new Error('Progresso da entrevista inválido.');
  for(const [id,r] of Object.entries(a.verbal)){if(!/^R(?:10|[1-9])\.[1-3]$/.test(id))throw new Error('Sondagem desconhecida.');checkReview(r);}
  for(const p of Object.values(a.practical)){if(p?.review)checkReview(p.review);if(!isObject(p)||(p.first!==undefined&&!isObject(p.first)))throw new Error('Registro prático inválido.');}
  for(const [id,r] of Object.entries(a.interview)){
    if(!/^D(?:0[1-9]|[12]\d|3[0-6])$/.test(id)||!isObject(r)||typeof r.answer!=='string'||typeof r.notes!=='string')throw new Error('Entrevista inválida.');
    if(r.qualifier!==null&&(typeof r.qualifier!=='string'||!Object.hasOwn(QUALIFIERS,r.qualifier)))throw new Error('Qualificador inválido.');
    if(!Array.isArray(r.evidenceIds)||r.evidenceIds.some(id=>typeof id!=='string')||new Set(r.evidenceIds).size!==r.evidenceIds.length)throw new Error('Vínculos de evidência inválidos.');
  }
  for(const v of Object.values(a.report))if(typeof v!=='string')throw new Error('Relatório inválido.');
  if(a.office!==undefined)validateOffice(a.office,a.id);
  if(a.officeReview!==undefined)validateOfficeReview(a.officeReview,a.office,officeDocs);
  return a;
}
function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function checkReview(r){if(!r||!['observado','NO','pendente'].includes(r.status)||typeof r.correct!=='boolean'||typeof r.independent!=='boolean'||['help','access','answer','notes'].some(k=>typeof r[k]!=='string'))throw new Error('Pontuação inválida.');if(r.status==='observado'&&!r.independent&&!r.help.trim())throw new Error('Descreva a ajuda fornecida.');}
export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
