import fs from 'node:fs/promises';
import path from 'node:path';
const destination=path.resolve('.site');
if(path.basename(destination)!=='.site'||path.dirname(destination)!==process.cwd())throw Error('Destino de publicação fora do diretório esperado.');
// Only generated output is replaced; assessment data and the workspace are never copied.
await fs.rm(destination,{recursive:true,force:true});await fs.mkdir(destination);
for(const entry of await fs.readdir('.',{withFileTypes:true})){
 if(entry.isFile()&&(/\.(js|css|html)$/.test(entry.name)||entry.name==='.nojekyll'))await fs.copyFile(entry.name,path.join(destination,entry.name));
}
for(const directory of ['assets','data','vendor'])await fs.cp(directory,path.join(destination,directory),{recursive:true,dereference:true});
console.log('Site estático preparado em .site (sem testes, relatórios de benchmark ou dados de avaliações).');
