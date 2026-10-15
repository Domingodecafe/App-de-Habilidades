import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
const suites=['reduced','navigation','office','office-review','review-regressions','external'];
let server;
try{
 let base=process.env.TEST_BASE_URL;
 if(!base){
  server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  base=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Servidor não iniciou em 15 segundos.')),15000);server.stdout.on('data',data=>{const match=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]+'/');}});server.once('error',reject);server.once('exit',code=>{clearTimeout(timeout);reject(Error(`Servidor encerrou: ${code}`));});});
 }
 const response=await fetch(base);if(!response.ok)throw Error('Servidor indisponível: '+response.status);
 await fs.mkdir('artifacts',{recursive:true});
 for(const name of suites){
  console.log(`\nTeste: ${name}`);const child=spawn(process.execPath,[`tests/${name}-browser.mjs`],{env:{...process.env,TEST_BASE_URL:base},stdio:['ignore','pipe','pipe']});let log='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{log+=data;process.stdout.write(data);});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});await fs.writeFile(`artifacts/${name}.log`,log);
  if(code!==0)throw Error(`Suíte ${name} falhou (${code}). Consulte artifacts/${name}.log.`);
 }
}catch(error){console.error(error);process.exitCode=1;}finally{server?.kill();}
