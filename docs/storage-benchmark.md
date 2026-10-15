# Medição do armazenamento — 15/10/2026

Chromium 156.0.8078.4; win32 x64; AMD Ryzen 5 5500U with Radeon Graphics         . Execução: 2026-10-15T15:54:29.492Z. Vinte repetições por cenário, contexto novo, chave isolada. Cada avaliação fictícia contém Discovery classificada, cinco etapas Office, primeiras/finais, revisão profissional e 108 eventos. Os lotes usam o mesmo estímulo determinístico, com IDs distintos.

CPU 4× é uma simulação de menor capacidade de processamento, não uma medição em tablet físico. O localStorage é mantido nesta versão, conforme a decisão de medir antes de migrar.

Os pares abaixo são **mediana / percentil 95**, em milissegundos. O tamanho é o JSON em UTF-8; a quota real depende do navegador e não deve ser inferida somente desse tamanho.

| CPU | Avaliações | JSON (MiB) | Serialização | Gravação | Leitura | Validação inicial | Falhas de quota |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1× | 10 | 0.47 | 0.85 / 1.10 | 0.85 / 1.40 | 0.10 / 0.20 | 18.80 / 20.70 | 0/20 |
| 1× | 50 | 2.33 | 4.65 / 6.50 | 8.20 / 10.00 | 0.80 / 0.90 | 89.05 / 104.00 | 0/20 |
| 1× | 100 | 4.65 | 11.70 / 13.40 | 17.80 / 19.80 | 1.80 / 1.90 | 178.90 / 191.90 | 0/20 |
| 1× | 500 | 23.27 | 46.80 / 48.00 | Não gravado | Não gravado | 888.70 / 914.70 | 20/20 |
| 4× | 10 | 0.47 | 4.40 / 5.60 | 3.65 / 5.30 | 0.50 / 0.70 | 113.05 / 122.30 | 0/20 |
| 4× | 50 | 2.33 | 24.35 / 28.70 | 36.50 / 38.50 | 3.00 / 5.10 | 575.35 / 602.00 | 0/20 |
| 4× | 100 | 4.65 | 54.20 / 63.10 | 69.30 / 82.50 | 7.20 / 10.40 | 1103.20 / 1294.80 | 0/20 |
| 4× | 500 | 23.27 | 256.60 / 279.20 | Não gravado | Não gravado | 5549.35 / 5959.00 | 20/20 |

## Interpretação e recomendação

Gravação acima de 50 ms no p95: 100 avaliações com CPU 4× (82.5 ms). A serialização ocorre antes da gravação e também bloqueia a interface; os dois custos devem ser considerados juntos, sem somar percentis como se fossem uma medição única.

Houve falha de quota em 500 avaliações, CPU 1×; 500 avaliações, CPU 4×. Nesses cenários, gravação e leitura aparecem sem tempo de sucesso. A validação inicial mede JSON.parse e as mesmas validações/migrações usadas na abertura do app; foi medida a partir do JSON em memória mesmo quando não foi possível gravar o lote.

Recomenda-se planejar IndexedDB por avaliação antes de ampliar a aplicação para coleções grandes, especialmente perto de 100 registros completos ou em dispositivos mais lentos. A falha com 500 registros já demonstra uma limitação de capacidade deste modelo de salvamento. A quantidade exata varia conforme texto, revisões e histórico de cada avaliação; os valores não são garantia de capacidade.

Uma próxima migração deverá verificar os registros transferidos antes de remover a cópia antiga, preservar a separação entre aplicação externa e cadastro do avaliador, e manter exportação de segurança em falhas. Ela não foi executada nesta atualização.

## Reproduzir

Execute `npm ci`, `npx playwright install chromium` e `npm run benchmark:storage`. O comando gera novamente este relatório e o [JSON com as medições](storage-benchmark.json). Não usa registros de participantes nem faz parte do CI. Execute sem outras suítes de navegador simultâneas para reduzir interferência.
