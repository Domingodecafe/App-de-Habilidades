import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as PDFLib from 'pdf-lib';
import {completedFixture} from './fixtures.mjs';
import {createAssessmentPDF,readAssessmentPDF} from '../assessment-pdf.js';
import {validateImport,createAssessment} from '../core.js';
import {createOffice} from '../office.js';
import {eventRow,snapshotDecision} from '../office-pdf-data.js';
globalThis.PDFLib=PDFLib;
const content=JSON.parse(await fs.readFile(new URL('../data/content.json',import.meta.url))),docs=JSON.parse(await fs.readFile(new URL('../data/games.json',import.meta.url))).docs;
test('PDF em tabelas preserva anexo integral, evidências e paginação de textos extensos',async()=>{
 await fs.mkdir('output/pdf',{recursive:true});
 const a=completedFixture(content,docs),original=structuredClone(a);validateImport(a,docs);
 const bytes=await createAssessmentPDF(a,content,docs),pdf=await PDFLib.PDFDocument.load(bytes);
 assert.deepEqual(await readAssessmentPDF(bytes),original);assert.deepEqual(a,original);
 await fs.writeFile('output/pdf/tabelas-amostra.pdf',bytes);
 const long=completedFixture(content,docs,{message:('Texto extenso de justificativa, com acentuação e comparação entre documentos. ').repeat(300)+'FINAL DA MENSAGEM EXTENSA'});
 long.officeReview.records.communication.support=('Recurso de acesso descrito pelo avaliador. ').repeat(100)+'FINAL DO APOIO';
 const large=await createAssessmentPDF(long,content,docs),largePDF=await PDFLib.PDFDocument.load(large);
 assert.ok(largePDF.getPageCount()>pdf.getPageCount());assert.deepEqual(await readAssessmentPDF(large),long);
 await fs.writeFile('output/pdf/tabelas-texto-extenso.pdf',large);
});
test('histórico legível traduz destinos e conserva texto completo das alterações',()=>{
 const before='Primeira mensagem',after='Nova mensagem '.repeat(500);
 assert.ok(eventRow({sequence:1,at:'2026-10-15T12:00:00.000Z',stage:5,action:'text',before,after})[3].includes(after));
 assert.equal(snapshotDecision(1,{response:{placements:{D01:'RECEBIDOS'}}},'D01'),'Lista inicial');
 assert.equal(snapshotDecision(2,null,'D01'),'Não registrada');
});
test('PDF aceita omissões, atividade incompleta e avaliação sem Office',async()=>{
 const a=createAssessment();assert.deepEqual(await readAssessmentPDF(await createAssessmentPDF(a,content,docs)),a);
 a.office=createOffice(a.id);const bytes=await createAssessmentPDF(a,content,docs);assert.deepEqual(await readAssessmentPDF(bytes),a);
 await fs.writeFile('output/pdf/tabelas-omissoes.pdf',bytes);
});
