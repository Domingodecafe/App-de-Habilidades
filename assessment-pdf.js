import {discoveryQuestions,integratedResults,DISCOVERY_DOMAINS} from './integrated.js';
import {officeResults,getOfficeEvaluation} from './office-evaluation.js';
let loading;
async function library(){
  if(globalThis.PDFLib)return globalThis.PDFLib;
  loading ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/pdf-lib.min.js',import.meta.url).href;s.onload=()=>resolve(globalThis.PDFLib);s.onerror=()=>{loading=null;reject(Error('Não foi possível carregar o gerador de PDF. Tente novamente.'));};document.head.append(s);});return loading;
}
// Standard PDF fonts support Portuguese; the attachment preserves all Unicode exactly.
function printable(value,font){return [...String(value??'')].map(c=>{if(c==='\n'||c==='\r'||c==='\t')return c;try{font.encodeText(c);return c;}catch{return '?';}}).join('');}
export async function createAssessmentPDF(assessment,content,docs){
  const {PDFDocument,StandardFonts,rgb}=await library(),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle('LADO A - Respostas e evidências');pdf.setAuthor('LADO A Employability');pdf.setSubject('Discovery e Escritório Digital - teste externo');
  const green=rgb(0,.28,.26),ink=rgb(.12,.2,.18),gray=rgb(.4,.46,.43);let page,y;
  function addPage(){page=pdf.addPage([595.28,841.89]);y=755;page.drawRectangle({x:0,y:793,width:595.28,height:49,color:green});page.drawText('LADO A | Employability',{x:42,y:811,size:16,font:bold,color:rgb(1,1,1)});}
  function space(height){if(!page||y-height<48)addPage();}
  function line(text,{size=10,heading=false,color=ink}={}){
    const f=heading?bold:font,clean=printable(text,f);let current='';
    for(const paragraph of clean.split(/\r?\n/)){
      current='';for(const char of paragraph){if(f.widthOfTextAtSize(current+char,size)>510){space(size+6);page.drawText(current,{x:42,y,size,font:f,color});y-=size+6;current='';}current+=char;}
      space(size+6);if(current)page.drawText(current,{x:42,y,size,font:f,color});y-=size+6;
    }
  }
  function title(text){space(45);y-=14;line(text,{heading:true,size:15,color:green});y-=7;}
  function radar(){
    addPage();title('Radar - habilidades avaliadas');
    line('Linhas independentes: Discovery (índigo) e Office (verde).');
    line('Somente notas confirmadas. Mínimo de duas oportunidades por habilidade.');
    const interview=integratedResults(assessment,discoveryQuestions(content)),office=officeResults(assessment,docs,DISCOVERY_DOMAINS);
    const cx=298,cy=510,R=110,pos=(i,v)=>({x:cx+Math.cos(2*Math.PI*i/5-Math.PI/2)*R*v/100,y:cy-Math.sin(2*Math.PI*i/5-Math.PI/2)*R*v/100});
    for(const value of [25,50,75,100])for(let i=0;i<5;i++)page.drawLine({start:pos(i,value),end:pos((i+1)%5,value),color:rgb(.8,.85,.81),thickness:.7});
    DISCOVERY_DOMAINS.forEach((name,i)=>{page.drawLine({start:{x:cx,y:cy},end:pos(i,100),color:rgb(.8,.85,.81),thickness:.7});const p=pos(i,150),words=name.split(' '),half=Math.ceil(words.length/2),lines=[words.slice(0,half).join(' '),words.slice(half).join(' ')];lines.forEach((text,j)=>page.drawText(text,{x:p.x-font.widthOfTextAtSize(text,9)/2,y:p.y-j*12,size:9,font,color:ink}));});
    for(const [rows,key,color] of [[interview,'interview',rgb(.1,.14,.5)],[office,'value',green]])rows.forEach((r,i)=>{if(r[key]===null)return;const p=pos(i,r[key]),next=rows[(i+1)%5][key];if(next!==null)page.drawLine({start:p,end:pos((i+1)%5,next),color,thickness:2});page.drawCircle({x:p.x,y:p.y,size:3,color});});
    y=310;line('Escala descritiva: 0 a 100. Eixos sem classificação não recebem zero.',{size:9});
    DISCOVERY_DOMAINS.forEach((name,i)=>{line(name,{heading:true});line(`Discovery: ${interview[i].interview===null?'dados insuficientes':interview[i].interview+' / 100'} (${interview[i].count} classificações) | Office: ${office[i].value===null?'dados insuficientes':office[i].value+' / 100'} (${office[i].count} confirmadas)`,{size:9});});
    line('Se o teste foi preenchido sem avaliador, a classificação poderá ser feita após o recebimento deste arquivo.',{size:9,color:gray});
  }
  addPage();title('Respostas e evidências do teste externo');
  line(`Participante: ${assessment.identity.code||'Não informado'}`,{heading:true,size:12});
  line(`ID da avaliação: ${assessment.id}`);line(`Data: ${assessment.identity.date} | Comunicação: ${assessment.identity.communication||'Não informada'}`);
  line(`Office: ${assessment.office?.status==='completed'?'concluído':assessment.office?'em andamento':'não iniciado'}`);
  line('Este PDF contém as respostas e uma cópia integral dos dados em anexo. O envio pelo WhatsApp é manual.');
  line('Os dados ficam no dispositivo de quem respondeu; não são enviados automaticamente para um servidor.');
  line('Para o avaliador: importe este PDF em Mais ações > Importar avaliação para revisar as evidências.');
  radar();
  title('Entrevista Discovery - respostas');
  for(const q of discoveryQuestions(content)){const record=assessment.integrated.records[q.id];title(`${q.id} - ${q.text}`);line(record?.answer||'Sem resposta registrada.');if(record?.score!==null&&record?.score!==undefined)line(`Classificação: ${record.score}/2`);}
  if(assessment.office){
    title('Escritório Digital - registros preservados');line(`Protocolo Office ${assessment.office.version}. ${assessment.office.adaptation}`);
    for(const stage of assessment.office.stages){title(`Etapa ${stage.step}`);line(`Início: ${stage.startedAt} | Conclusão: ${stage.completedAt||'não concluída'}`);
      for(const [label,snapshot] of [['Primeira entrega',stage.first],['Entrega final',stage.final]]){line(label,{heading:true});line(snapshot?JSON.stringify(snapshot.response,null,2):'Não registrada.',{size:9});}
    }
    title('Ajuda, pausas e histórico das ações');
    for(const e of assessment.office.events)line(JSON.stringify(e),{size:8});
    title('Revisão do avaliador');
    for(const item of getOfficeEvaluation(assessment,docs)){line(item.op.name,{heading:true});line(!item.available?'Não aplicada':item.record.confirmedAt?JSON.stringify(item.record,null,2):'Revisão pendente.',{size:9});}
  }
  const data=new TextEncoder().encode(JSON.stringify(assessment,null,2));
  await pdf.attach(data,'avaliacao-lado-a.json',{mimeType:'application/json',description:'Cópia integral da avaliação para importar no LADO A'});
  const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`LADO A - ${i+1}/${pages.length}`,{x:42,y:25,size:8,font,color:gray}));
  return pdf.save();
}
export async function readAssessmentPDF(bytes){
  const {PDFDocument,PDFName,PDFArray,PDFDict,decodePDFRawStream}=await library(),pdf=await PDFDocument.load(bytes);
  const names=pdf.catalog.lookup(PDFName.of('Names'),PDFDict)?.lookup(PDFName.of('EmbeddedFiles'),PDFDict)?.lookup(PDFName.of('Names'),PDFArray);
  if(names)for(let i=0;i<names.size();i+=2){const spec=names.lookup(i+1,PDFDict),stream=spec.lookup(PDFName.of('EF'),PDFDict)?.lookup(PDFName.of('F'));if(stream){const text=new TextDecoder().decode(decodePDFRawStream(stream).decode());try{const data=JSON.parse(text);if(data.id&&data.schema)return data;}catch{/* Other attachments are ignored. */}}}
  throw Error('Este PDF não contém os dados de uma avaliação LADO A.');
}
