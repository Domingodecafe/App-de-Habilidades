import fs from 'node:fs/promises';
export async function writeStorageReport(data){
 const metric=value=>value?`${value.medianMs.toFixed(2)} / ${value.p95Ms.toFixed(2)}`:'Não gravado';
 const slow=data.measurements.filter(m=>m.times.write?.p95Ms>50),quota=data.measurements.filter(m=>m.quotaFailures);
 const report=`# Medição do armazenamento — 15/10/2026

Chromium ${data.browser}; ${data.platform}; ${data.cpu}. Execução: ${data.date}. Vinte repetições por cenário, contexto novo, chave isolada. Cada avaliação fictícia contém Discovery classificada, cinco etapas Office, primeiras/finais, revisão profissional e ${data.measurements[0].eventsPerAssessment} eventos. Os lotes usam o mesmo estímulo determinístico, com IDs distintos.

CPU 4× é uma simulação de menor capacidade de processamento, não uma medição em tablet físico. O localStorage é mantido nesta versão, conforme a decisão de medir antes de migrar.

Os pares abaixo são **mediana / percentil 95**, em milissegundos. O tamanho é o JSON em UTF-8; a quota real depende do navegador e não deve ser inferida somente desse tamanho.

| CPU | Avaliações | JSON (MiB) | Serialização | Gravação | Leitura | Validação inicial | Falhas de quota |
|---|---:|---:|---:|---:|---:|---:|---:|
${data.measurements.map(m=>`| ${m.cpu}× | ${m.count} | ${(m.bytes/1024/1024).toFixed(2)} | ${metric(m.times.serialize)} | ${metric(m.times.write)} | ${metric(m.times.read)} | ${metric(m.times.initialValidation)} | ${m.quotaFailures}/20 |`).join('\n')}

## Interpretação e recomendação

${slow.length?`Gravação acima de 50 ms no p95: ${slow.map(m=>`${m.count} avaliações com CPU ${m.cpu}× (${m.times.write.p95Ms} ms)`).join('; ')}.`:'A gravação isolada não ultrapassou 50 ms no p95 dos cenários que couberam na quota.'} A serialização ocorre antes da gravação e também bloqueia a interface; os dois custos devem ser considerados juntos, sem somar percentis como se fossem uma medição única.

${quota.length?`Houve falha de quota em ${quota.map(m=>`${m.count} avaliações, CPU ${m.cpu}×`).join('; ')}. Nesses cenários, gravação e leitura aparecem sem tempo de sucesso.`:'Não houve falhas de quota nos lotes medidos.'} A validação inicial mede JSON.parse e as mesmas validações/migrações usadas na abertura do app; foi medida a partir do JSON em memória mesmo quando não foi possível gravar o lote.

Recomenda-se planejar IndexedDB por avaliação antes de ampliar a aplicação para coleções grandes, especialmente perto de 100 registros completos ou em dispositivos mais lentos. A falha com 500 registros já demonstra uma limitação de capacidade deste modelo de salvamento. A quantidade exata varia conforme texto, revisões e histórico de cada avaliação; os valores não são garantia de capacidade.

Uma próxima migração deverá verificar os registros transferidos antes de remover a cópia antiga, preservar a separação entre aplicação externa e cadastro do avaliador, e manter exportação de segurança em falhas. Ela não foi executada nesta atualização.

## Reproduzir

Execute \`npm ci\`, \`npx playwright install chromium\` e \`npm run benchmark:storage\`. O comando gera novamente este relatório e o [JSON com as medições](storage-benchmark.json). Não usa registros de participantes nem faz parte do CI. Execute sem outras suítes de navegador simultâneas para reduzir interferência.
`;
 await fs.writeFile('docs/storage-benchmark.md',report);
}
