# LADO A | Employability — Entrevista Discovery 0.4

Aplicativo local para construção de um Perfil Profissional Individualizado. HTML, CSS e JavaScript, sem dependências externas em execução.

## Executar

Execute `node server.mjs` e abra http://127.0.0.1:4173. Mantenha a mesma origem e navegador para recuperar os dados locais.

## Perfil baseado na entrevista Discovery

- Navegação: Cadastro → Entrevista Discovery → Simulações profissionais → Perfil profissional.
- 28 perguntas Discovery: 16 descritivas e 12 sobre habilidades relatadas. O perfil pode ser concluído, revisado e exportado sem prática.
- Pré-cadastro opcional e editável com os mesmos campos do perfil.
- Junções Discovery: D01/D07/D08/D33, D03/D04, D10/D17, D25/D26, D28/D29 e D31/D32. Perguntas originais disponíveis como complementos.
- As sondagens RFT saíram do percurso e do radar; seus registros antigos permanecem no histórico.
- Critérios explícitos: 0 nenhum componente demonstrado; 1 parte dos componentes; 2 todos. Ausência de evidência permanece sem nota.
- Interesses, preferências e apoios descritivos não recebem nota. Ajuda, independência e acessibilidade são registrados separadamente.
- Primeira evidência classificada preservada. Editar a resposta exige nova classificação.
- Radar Discovery — evidências relatadas: cinco eixos (compreensão de instruções, sequenciamento, priorização e atualização, conferência e divergências, comunicação funcional). Média dos pontos / 2 × 100; mínimo operacional de duas classificações. Selecionar a habilidade abre seus relatos e critérios.
- Somente a linha Discovery aparece no radar atual. O Escritório Digital é o primeiro minijogo funcional, com registros comportamentais separados das pontuações. Os outros quatro jogos permanecem em aberto; os arquivos históricos foram preservados e não alimentam este radar. A comparação futura deverá usar os mesmos cinco eixos.
- Exportações JSON, PNG e PDF (impressão do navegador); demonstração inteiramente fictícia.

## Compatibilidade e interpretação

JSON esquema 4 aceita versões 1, 2 e 3. Registros anteriores são preservados. Nas versões 1/2, o campo `integrated` começa vazio, sem conversão de qualificadores antigos. Na versão 3, respostas, notas 0/1/2 e primeiras evidências Discovery são reutilizadas, pois os critérios permanecem iguais; registros RFT ficam históricos e são excluídos dos cálculos. A retomada é adaptada pelo identificador: uma pergunta Discovery é mantida, uma sondagem RFT retorna à primeira Discovery. A versão atual salva índice e identificador coerentes. A mudança de protocolo volta o relatório a rascunho para revisão, preservando o protocolo anterior em `previousProtocol`. Vínculos com práticas anteriores permitem consulta, sem efeito na pontuação.

Os 66 itens originais permanecem em `data/content.json`; a seleção, junções, critérios e cálculos revisados estão em `integrated.js`; a interface e o relatório em `integrated-view.js`. Cálculos históricos continuam em `core.js` e não são alterados pelas classificações novas.

A correspondência entre itens e cinco habilidades é uma proposta de conteúdo, ainda sem validação psicométrica ou equivalência demonstrada entre modalidades. Resultados não representam diagnóstico, classificação global de aptidão ou critério de exclusão profissional. A redução de conteúdo necessita avaliação empírica de compreensão, cobertura e concordância entre avaliadores.

Use dados fictícios: a persistência local não possui autenticação ou infraestrutura clínica de produção. As respostas não são enviadas a serviços externos. Exporte JSON para backup.

## Referências preservadas

- [Manual de Aplicação](https://docs.google.com/document/d/1rXmdTnCLfrsmGwBzx_DjM1Q9BdQPLnzzvHcOlZEoabw/edit).
- [Caderno de Materiais](https://docs.google.com/document/d/1IV4nPlEMGnyUEio_DA8K1IB8OeOKRbKUR0l4QB6sqVs/edit).

Cópias de referência em `references/`, obtidas em 13/10/2026. Cenário fixo de escritório/estoque: **15/06/2027**. Data da avaliação e data do cenário são distintas.

## Verificação

`node --test tests/*.test.mjs` verifica conteúdo, cálculo, validação e compatibilidade histórica. Com o servidor ativo, `node tests/browser.mjs` testa navegação, retomada, classificação, histórico, computador/tablet e exportações JSON/PNG/PDF usando Chrome e Playwright. Configure `PLAYWRIGHT_MODULE` fora do runtime Codex. Saídas fictícias de teste ficam em `artifacts/`.


## Interface e retomada

A interface usa o logotipo oficial LADO A e a paleta verde #004743, índigo #1A237E, sálvia #7FA78D e lavanda #E8EAF6. O perfil tem abas Resumo, Evidências e Editar perfil, navegáveis também pelas setas do teclado. Os campos de texto crescem conforme a escrita.

Trocar de etapa, pergunta ou aba abre o conteúdo no topo. Atualizar o navegador na mesma aba restaura avaliação, pergunta, seção do perfil, posição da rolagem e campo/cursor de edição. Essa posição fica no sessionStorage; as respostas continuam no salvamento local existente. Atualizações da mesma tela preservam sua posição.

Verificação adicional: `node tests/navigation-browser.mjs` testa a navegação e a retomada em larguras de computador (1440 px) e tablet (768 px), com dados fictícios isolados.

## LADO A Office | Central Administrativa

Na seção **Simulações profissionais**, escolha **Iniciar / Retomar Escritório Digital**. Para testar sem alterar a avaliação atual, use **Testar com avaliação fictícia**, que cria uma avaliação separada.

O Office tem cinco etapas: classificação, ordenação em lista única, urgências, mudança de regra e comunicação escrita. Cada etapa inicia um lote independente. Os cartões D01–D12 mantêm os dados originais de data/games.json, conferidos com references/materials.txt; o setor correto fica oculto na apresentação. O procedimento é identificado como adaptação digital e exige inferência na classificação.

Use arrastar e soltar ou o seletor de destino; a barra mostra apenas RH/Financeiro/Operações e VERIFICAR na etapa 4. A origem é Documentos para organizar e não é uma pasta de destino; cartões distribuídos oferecem Devolver à lista inicial. na ordenação, use arraste ou os botões subir/descer. Os destinos de arraste permanecem visíveis durante a rolagem. **Registrar primeira resposta** preserva a primeira entrega; revisões continuam possíveis até **Concluir etapa**. Entregas incompletas são aceitas após confirmação neutra. Nenhum acerto, erro ou nota é exibido.

**Pausar**, sair da atividade ou recarregar preserva o registro e bloqueia a sessão até a retomada. **Solicitar ajuda** registra o pedido e orienta chamar o avaliador. A comunicação final mostra exclusivamente a distribuição feita pelo participante na etapa 4. Uma atividade concluída é consultável e não pode ser reiniciada na mesma avaliação.

O campo opcional office, versões 1 e 2, fica separado de practical e dos cálculos RFT/Discovery. Ele contém assessmentId, adaptation, scenarioDate, demo, currentStage, status, stages e events. Cada etapa contém initial/current e as entregas first/final com horário; cada evento contém sequence, at, stage, document, action, origin/destination e before/after, com posições para movimentações. A disposição inicial é embaralhada uma vez e preservada. Edições textuais são registradas após 450 ms sem digitação, ou imediatamente antes de uma ação, exportação ou saída.

API modular em office.js: createOffice(assessmentId, options), applyOffice(session, action, payload), getOfficeRecords(assessment), exportOfficeJSON(assessment), validateOffice(session, assessmentId). A consulta retorna uma cópia. A exportação própria contém o registro Office; a exportação completa do aplicativo inclui esse registro junto com a avaliação e permite reimportação. Na importação completa, a avaliação recebe novo ID e sourceAssessmentId preserva a origem do Office. Históricos inconsistentes são rejeitados por reexecução dos eventos contra os estímulos iniciais antes de inserir a cópia.

Verificação: node --test tests/*.test.mjs e, com o servidor ativo, node tests/office-browser.mjs. O teste de navegador aceita PLAYWRIGHT_MODULE e usa o Playwright já instalado no ambiente; isso não adiciona dependência ao aplicativo. Capturas de desktop/tablet ficam em artifacts/office-*.png.

## Matriz do Office — office-matrix-1

Novas atividades usam o protocolo Office 2. Antes da ordenação e da mudança de regra, o participante explica a instrução; depois da ordenação e da marcação de urgências, explica a conferência com exemplo concreto. A explicação inicial precede a liberação dos controles da tarefa e pode ser entregue em branco após confirmação neutra. As quatro perguntas aceitam escrita, fala ou comunicação alternativa registrada pelo avaliador. Respostas são salvas nos snapshots inicial, primeira entrega e entrega final e nos eventos answer/release-instruction. As atividades Office 1 continuam no protocolo original, sem perguntas adicionadas retroativamente.

Após a conclusão, abra **Revisar evidências do Office** na seção Simulações profissionais. Para tarefas objetivas, o sistema sugere notas conforme as faixas: abaixo de 50% = 0, de 50% a menos de 100% = 1, 100% = 2. A ordenação aceita empates de data; urgência inclui 17/06/2027; nenhuma marcação recebe 0 mesmo quando os seis não urgentes ficaram desmarcados. A etapa 4 exige D04/D11 em VERIFICAR e os outros dez cartões nos setores originais, combinando atualização da regra e classificação por setor. A etapa 1 é complementar.

Respostas abertas têm dois componentes, classificados pelo avaliador como demonstrado ou não demonstrado. O sistema soma os componentes para sugerir 0/1/2; ele não interpreta texto automaticamente. Uma resposta em branco sugere 0 por omissão. Comunicação avalia relato fiel das ações e motivo compreensível, independentemente do acerto administrativo. Conferência exige critério e comparação concreta; não exige encontrar erro quando o resultado estiver correto.

Escolher a condição de observação e a nota não basta: **Confirmar revisão desta oportunidade** é obrigatório. Ajustar a nota exige motivo; recusa, interrupção ou barreira impeditiva exigem motivo e não entram na média. Apoio recebido, acessibilidade e autonomia são campos separados. Autonomia com ajuda exige descrição do apoio, sem reduzir automaticamente a nota. Alterar qualquer campo invalida a confirmação anterior.

A revisão está no campo opcional officeReview da avaliação, com matrixVersion, protocolVersion, evidenceKey e records. O identificador evidenceKey vincula a revisão às entregas finais preservadas. Os registros contêm condição, componentes, nota, motivo, apoio, acesso, autonomia, transcrição, modalidade e confirmedAt. A exportação completa do aplicativo ou o botão **Exportar avaliação com revisão (JSON)** preserva os dois campos; a exportação do ambiente participante continua contendo apenas os registros comportamentais do Office.

API em office-evaluation.js: objectiveEvidence, getOfficeEvaluation, officeResults, setOfficeReviewField, useOfficeSuggestion, confirmOfficeOpportunity e validateOfficeReview. validateImport aceita officeDocs como segundo argumento para conferir também a consistência das confirmações na importação.

Resultados em **Desempenho no Office — entrega final** aparecem na revisão, no perfil e no PDF. Cada eixo só apresenta valor com duas oportunidades confirmadas e observadas; média das notas ÷ 2 × 100, pesos iguais. Sequenciamento e comunicação têm uma oportunidade e permanecem com dados insuficientes. Não há média conjunta com Discovery nem alteração do radar existente: os resultados ficam preparados para uma integração futura.

Verificação adicional: node tests/office-review-browser.mjs exercita componentes, confirmação, ajustes, apoios, exclusões, recarga, exportação e separação da interface do participante em desktop e tablet.

## Primeiro teste externo publicado

Link para o participante: https://domingodecafe.github.io/App-de-Habilidades/?teste=1
Área do avaliador: https://domingodecafe.github.io/App-de-Habilidades/

O modo externo agora exige aplicação acompanhada, com identificação do participante e do avaliador, concordância, 28 perguntas Discovery e o Office. O painel do avaliador é expansível e começa recolhido, ao lado da atividade no desktop e abaixo no tablet/celular. Usa armazenamento local separado do avaliador e restaura o percurso após recarga. Ao concluir o Office, abre a revisão do avaliador. O PDF final é liberado somente após as decisões de todas as perguntas de habilidade Discovery e oportunidades Office aplicadas. A conclusão inicia o download e oferece um botão para baixar novamente. O envio por WhatsApp é manual.

O PDF contém identificação, radar com cinco eixos, respostas Discovery, primeiras/finais do Office, histórico de ações e revisão quando disponível. O radar distingue Discovery e Office; valores só aparecem após classificações válidas/confirmadas e cobertura mínima. Um preenchimento sem avaliador apresenta dados insuficientes. O arquivo também inclui um anexo JSON interno com a avaliação integral, preservando inclusive caracteres que não estejam disponíveis na fonte padrão do PDF.

Para receber o resultado, baixe o PDF enviado pela pessoa e use **Mais ações > Importar avaliação** na área do avaliador. O aplicativo extrai o anexo e importa uma cópia; então revise as evidências do Office e classifique a entrevista. Depois, **Baixar PDF com radar** na revisão gera outro PDF com os resultados confirmados. O PDF não depende de impressão, banco de dados remoto ou envio automático.

PDF-lib é distribuído localmente em vendor/ com sua licença MIT. GitHub Pages publica main na raiz; .nojekyll mantém os módulos e recursos estáticos. Arquivos de testes gerados e avaliações não são versionados.

Teste adicional: node tests/external-browser.mjs. Para verificar o site publicado, configure TEST_BASE_URL com a URL acima (sem a query).

## Aplicação acompanhada - fluxo externo 2

Na Discovery, cada resposta de habilidade exige **Confirmar classificação** ou **Registrar sem classificação** com motivo antes de avançar. Perguntas descritivas não recebem nota. Editar resposta ou campos do avaliador invalida a decisão anterior. Respostas anteriores e a primeira evidência permanecem preservadas. Uma ausência justificada mantém nota nula, sem impor zero.

Durante o Office, o painel do avaliador registra apoio, acessibilidade, autonomia e observações por etapa. Esses dados ficam separados dos eventos da tarefa e são aproveitados na revisão final sem gerar notas nem substituir revisões existentes. Após o jogo, o painel de revisão Office fica recolhido; confirme as oportunidades aplicadas. A área de decisões Discovery permite consultar e corrigir pendências.

**Concluir avaliação e baixar PDF** requer avaliador identificado, Office concluído e todas as decisões profissionais registradas. Recusa, interrupção ou barreira com justificativa permitem concluir sem atribuir nota. Isso não altera o mínimo de duas classificações para exibir um eixo no radar. O PDF contém avaliador responsável, estado da revisão, apoios e observações, respostas e radar, além do JSON integral interno. Falha de download mantém a avaliação concluída e permite nova tentativa.

Metadados opcionais em assisted, versão 1: discoveryReviews (decisão, fingerprint dos campos revisados, horário), officeObservations (apoio/acesso/autonomia/notas por etapa), officePrepared e completedAt. external usa versão 2. O protocolo Office não muda: RECEBIDOS continua como origem interna e destino de devolução, preservando compatibilidade e omissões. Registros externos anteriores passam à revisão ao retomar; nenhuma nota, pergunta ou ação histórica é fabricada.

Verificação: 39 testes de lógica e percurso do navegador em 1440, 768 e 390 px, incluindo teclado, decisões obrigatórias, devolução de cartões, revisão, PDF, recarga, importação e repetição após falha do gerador de PDF.


## Manutenção e publicação — atualização de 15/10/2026

Requisitos de desenvolvimento: Node 24 e npm. A aplicação publicada continua estática, sem instalar bibliotecas no dispositivo do participante.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm run test:browser
# Ou executar ambas as verificações:
npm run test:all
```

Os testes usam o Chromium instalado pelo Playwright, sem depender de Chrome ou caminhos pessoais. O comando `test:browser` inicia um servidor em porta livre, aguarda sua disponibilidade e executa as seis suítes em sequência. Capturas, traces e logs ficam em `artifacts/`. Para verificar o site publicado, use a variável `TEST_BASE_URL` com sua URL terminada em `/`. `tests/browser.mjs` continua como encaminhamento de compatibilidade e não é executado uma segunda vez pelo runner.

O workflow **Testar e publicar LADO A** executa os testes em pushes e pull requests. Somente `main` publica, depois da aprovação do job de testes; pull requests não publicam. `npm run build:pages` cria `.site/` com HTML, módulos, CSS e recursos necessários. Testes, benchmarks, node_modules e arquivos locais de avaliações não entram no pacote. Pages usa GitHub Actions como origem da publicação; o endereço público permanece o mesmo. Em falhas, o workflow guarda os diagnósticos por sete dias. A configuração segue os [workflows oficiais do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) e a [instalação de navegadores Playwright para CI](https://playwright.dev/docs/ci-intro).

Ao final do teste, **Voltar ao início da avaliação** abre o cadastro na raiz, sem `?teste=1`. Os registros externos permanecem na chave separada; ao retornar ao link externo, a avaliação concluída e o download continuam disponíveis. Esse botão não reinicia o jogo.

As telas e ações de aplicação dos protocolos históricos foram retiradas do bootstrap atual. A consulta anterior é somente leitura e usa `legacy-history.js`, carregado sob demanda. Critérios de validação, migrações e funções históricas públicas de cálculo continuam disponíveis e cobertos por testes; respostas antigas não são convertidas em notas novas.

O PDF direto apresenta entregas, respostas abertas, histórico e revisão em tabelas, com cabeçalhos repetidos e continuação de textos extensos. O radar permanece separado por modalidade e o anexo `avaliacao-lado-a.json` preserva os registros integrais para importação. Os testes geram exemplos em `output/pdf/`, sem versionar avaliações.

### Benchmark manual do armazenamento

```sh
npm run benchmark:storage
```

O benchmark inicia seu próprio servidor e um contexto novo de Chromium. Usa somente avaliações fictícias, uma chave isolada e vinte repetições por cenário: 10, 50, 100 e 500 avaliações, em CPU normal e desacelerada quatro vezes. Não acessa os registros do navegador de aplicação. Gera `docs/storage-benchmark.json`; resultados e recomendação ficam em `docs/storage-benchmark.md`. Os tempos não são um critério de bloqueio do CI. IndexedDB não foi introduzido nesta atualização.

Verificação desta atualização: 45 testes de lógica, seis suítes de navegador, comparação de PDF com o mesmo conjunto fictício (21 páginas antes, 20 em tabelas) e inspeção visual de tabelas e continuação de respostas extensas. O tamanho em bytes pode crescer devido ao desenho das tabelas; a redução de páginas varia conforme os registros.
