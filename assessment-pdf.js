import {discoveryQuestions,integratedResults,DISCOVERY_DOMAINS} from './integrated.js';
import {officeResults,getOfficeEvaluation} from './office-evaluation.js';
import {stageQuestions,MODALITIES} from './office-protocol.js';
import {snapshotDecision,eventRow,conditionName,autonomyName} from './office-pdf-data.js';
let loading;
async function library(){
  if(globalThis.PDFLib)return globalThis.PDFLib;
  loading ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/pdf-lib.min.js',import.meta.url).href;s.onload=()=>resolve(globalThis.PDFLib);s.onerror=()=>{loading=null;reject(Error('Não foi possível carregar o gerador de PDF. Tente novamente.'));};document.head.append(s);});return loading;
}
// Standard PDF fonts support Portuguese; the attachment preserves all Unicode exactly.
function printable(value,font){return [...String(value??'')].map(c=>{if(c==='\n'||c==='\r'||c==='\t')return c;try{font.encodeText(c);return c;}catch{return '?';}}).join('');}
export async function createAssessmentPDF(assessment,content,docs){
  // Freeze the export before loading the library; edits during loading must not mix versions.
  assessment=structuredClone(assessment);
  const {PDFDocument,StandardFonts,rgb}=await library(),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle('LADO A - Respostas e evidências');pdf.setAuthor('LADO A Employability');pdf.setSubject('Discovery e Escritório Digital - teste externo');
  const green=rgb(0,.28,.26),ink=rgb(.12,.2,.18),gray=rgb(.4,.46,.43);let page,y;
  function addPage(){page=pdf.addPage([595.28,841.89]);y=755;page.drawRectangle({x:0,y:793,width:595.28,height:49,color:green});page.drawText('LADO A | Employability',{x:42,y:811,size:16,font:bold,color:rgb(1,1,1)});}
  function space(height){if(!page||y-height<48)addPage();}
  function wrapText(value,width,f,size){
    const output=[],widths=new Map();const measure=char=>{if(!widths.has(char))widths.set(char,f.widthOfTextAtSize(char,size));return widths.get(char);};
    for(const paragraph of printable(value,f).replace(/\t/g,'    ').split(/\r\n|\r|\n/)){
      let text='',length=0;
      for(const char of paragraph){
        const w=measure(char);if(length+w>width){const cut=text.lastIndexOf(' ');if(cut>0){output.push(text.slice(0,cut));text=text.slice(cut+1);}else{output.push(text);text='';}length=[...text].reduce((sum,c)=>sum+measure(c),0);}
        text+=char;length+=w;
      }output.push(text);
    }return output;
  }
  function line(text,{size=10,heading=false,color=ink}={}){
    const f=heading?bold:font;
    for(const current of wrapText(text,510,f,size)){space(size+6);if(current)page.drawText(current,{x:42,y,size,font:f,color});y-=size+6;}
  }
  function title(text){space(45);y-=14;line(text,{heading:true,size:15,color:green});y-=7;}
  function table(headers,widths,rows){
    const size=8.5,leading=11,padding=6;
    function wrap(value,width,f=font){
      return wrapText(value,width-padding*2,f,size);
    }
    function cells(lines,start,count,header=false,stripe=false){
      const height=count*leading+padding*2;let x=42;
      for(let i=0;i<widths.length;i++){
        page.drawRectangle({x,y:y-height,width:widths[i],height,color:header?green:stripe?rgb(.96,.98,.96):rgb(1,1,1),borderColor:rgb(.82,.87,.83),borderWidth:.5});
        const segment=i===0&&start>=lines[i].length?[lines[i][0]]:lines[i].slice(start,start+count);
        segment.forEach((text,j)=>{if(text)page.drawText(text,{x:x+padding,y:y-padding-size-j*leading,size,font:header?bold:font,color:header?rgb(1,1,1):ink});});x+=widths[i];
      }y-=height;
    }
    const heading=headers.map((h,i)=>wrap(h,widths[i],bold)),headingLines=Math.max(...heading.map(l=>l.length)),headerHeight=headingLines*leading+padding*2;
    const fresh=()=>{addPage();cells(heading,0,headingLines,true);};
    space(headerHeight+leading+padding*2);cells(heading,0,headingLines,true);
    rows.forEach((row,index)=>{
      const lines=row.map((value,i)=>wrap(value,widths[i])),count=Math.max(...lines.map(l=>l.length));let offset=0;
      const whole=count*leading+padding*2;
      if(whole<=755-48-headerHeight&&whole>y-48)fresh();
      while(offset<count){
        let capacity=Math.floor((y-48-padding*2)/leading);if(capacity<1){fresh();capacity=Math.floor((y-48-padding*2)/leading);}
        const take=Math.min(capacity,count-offset);cells(lines,offset,take,false,index%2===1);offset+=take;
        if(offset<count)fresh();
      }
    });y-=12;
  }
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
    line(assessment.assisted?'Aplicação acompanhada. Eixos sem cobertura suficiente permanecem sem valor.':'Classificações pendentes podem ser revisadas pelo avaliador após o recebimento deste arquivo.',{size:9,color:gray});
  }
  addPage();title('Respostas e evidências do teste externo');
  line(`Participante: ${assessment.identity.code||'Não informado'}`,{heading:true,size:12});
  line(`Avaliador responsável: ${assessment.identity.professional||'Não informado'}`);if(assessment.assisted)line(`Aplicação acompanhada: ${assessment.assisted.completedAt?'revisão concluída em '+new Date(assessment.assisted.completedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'revisão pendente'}`);line(`ID da avaliação: ${assessment.id}`);line(`Data: ${assessment.identity.date} | Comunicação: ${assessment.identity.communication||'Não informada'}`);
  line(`Office: ${assessment.office?.status==='completed'?'concluído':assessment.office?'em andamento':'não iniciado'}`);
  line('Este PDF contém as respostas e uma cópia integral dos dados em anexo. O envio pelo WhatsApp é manual.');
  line('Os dados ficam no dispositivo de quem respondeu; não são enviados automaticamente para um servidor.');
  line('Para o avaliador: importe este PDF em Mais ações > Importar avaliação para revisar as evidências.');
  radar();addPage();
  title('Entrevista Discovery - respostas');
  for(const q of discoveryQuestions(content)){const record=assessment.integrated.records[q.id];title(`${q.id} - ${q.text}`);line(record?.answer||'Sem resposta registrada.');if(record?.reason)line('Motivo de não classificação: '+record.reason);if(record?.help)line('Ajuda: '+record.help);if(record?.access)line('Acessibilidade: '+record.access);if(record?.notes)line('Observações: '+record.notes);if(record?.score!==null&&record?.score!==undefined)line(`Classificação: ${record.score}/2`);}
  if(assessment.office){
    title('Escritório Digital - registros preservados');line(`Protocolo Office ${assessment.office.version}. ${assessment.office.adaptation}`);
    for(const stage of assessment.office.stages){
      title(`Etapa ${stage.step}`);line(`Início: ${stage.startedAt} | Conclusão: ${stage.completedAt||'não concluída'}`);
      const observation=assessment.assisted?.officeObservations[stage.step];
      if(observation)table(['Acompanhamento','Registro'],[120,390],[['Autonomia',autonomyName(observation.autonomy)],['Apoio recebido',observation.support||'Não registrado'],['Acessibilidade',observation.access||'Não registrada'],['Observações',observation.notes||'Não registradas']]);
      if(stage.step!==5)table(['Documento / prazo','Primeira entrega','Entrega final'],[230,140,140],docs.map(d=>[`${d.id} · ${d.name}\nPrazo: ${d.date}`,snapshotDecision(stage.step,stage.first,d.id),snapshotDecision(stage.step,stage.final,d.id)]));
      for(const [id,q] of stageQuestions(stage.step)){
        if(assessment.office.version!==2)continue;
        line(q.text,{heading:true});
        table(['Entrega','Resposta / modalidade'],[100,410],[['Primeira',stage.first?`${stage.first.response.answers[id].text||'(em branco)'}\n${MODALITIES[stage.first.response.answers[id].mode]}`:'Não registrada'],['Final',stage.final?`${stage.final.response.answers[id].text||'(em branco)'}\n${MODALITIES[stage.final.response.answers[id].mode]}`:'Não registrada']]);
      }
      if(stage.step===5)table(['Mensagem','Resposta'],[100,410],[['Primeira entrega',stage.first?stage.first.response.text||'(em branco)':'Não registrada'],['Entrega final',stage.final?stage.final.response.text||'(em branco)':'Não registrada']]);
    }
    title('Ajuda, pausas e histórico das ações');line('Horários em UTC (ISO). A sequência preserva a ordem de todas as ações.',{size:9});
    table(['Seq.','Horário UTC','Etapa / doc.','Ação / alteração'],[35,110,65,300],assessment.office.events.map(eventRow));
    title('Revisão do avaliador');
    for(const item of getOfficeEvaluation(assessment,docs)){
      title(item.op.name);if(!item.available){line('Não aplicada');continue;}
      const r=item.record;
      table(['Critério / condição','Registro'],[130,380],[['Condição',conditionName(r.condition)],['Nota sugerida',item.suggestion===null?'Aguardando componentes':String(item.suggestion)+'/2'],['Nota confirmada',r.confirmedAt&&r.condition==='observed'?`${r.score}/2`:'Sem nota confirmada'],['Confirmação',r.confirmedAt||'Pendente'],['Motivo',r.reason||'Não registrado'],['Autonomia',autonomyName(r.autonomy)],['Apoio recebido',r.support||'Não registrado'],['Acessibilidade',r.access||'Não registrada'],...(item.op.components?item.op.components.map((text,i)=>[text,r.components[i]===null?'Não classificado':r.components[i]?'Demonstrado':'Não demonstrado']):[]),...(r.transcription?[['Transcrição',r.transcription],['Modalidade',MODALITIES[r.modality]]]:[])]);
    }
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
