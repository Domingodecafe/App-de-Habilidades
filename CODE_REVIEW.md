# Revisão do aplicativo — 14/10/2026

## Correções aplicadas

- Radar Discovery: nas avaliações acompanhadas, notas propostas ou cuja evidência mudou são excluídas até confirmação válida. Avaliações antigas sem esses metadados conservam o comportamento anterior.
- Área do avaliador: permite reconfirmar a Discovery de uma avaliação acompanhada importada, inclusive registrar ausência justificada.
- Importação e retomada: validam versão, fase, índice da pergunta e compatibilidade entre fase externa e conclusão do Office, antes de substituir dados.
- PDF: captura uma cópia integral no início da geração; alterações durante o carregamento da biblioteca não misturam versões do relatório. Nome do arquivo também é capturado no início.
- Falha de armazenamento: oferece imediatamente exportação integral JSON, inclusive no modo externo. Descarrega texto pendente do Office antes de exportar.
- Revisão Office: confirmação de recusa, interrupção ou barreira limpa a nota proposta. Editar texto da revisão atualiza imediatamente o bloqueio de conclusão.
- Retorno pelo histórico do navegador: redesenha a atividade pausada ao recuperar uma página do cache de navegação.

## Eficiência

- Dados da demonstração são buscados somente ao solicitar a demonstração, com tratamento de falha e nova tentativa.
- Quebra de linhas do PDF acumula larguras dos caracteres, evitando medir repetidamente todo o prefixo da linha.
- Regra de confirmação Discovery centralizada em módulo independente, compartilhado pela revisão e cálculo.

## Verificação

42 testes de lógica. Suítes de navegador: Office, revisão Office, Discovery reduzida, navegação, percurso externo em 1440/768/390 px e regressões específicas de armazenamento, exportação concorrente e reconfirmação após importação. PDF com radar renderizado para inspeção visual; anexo integral testado por exportação/importação.

## Melhorias futuras recomendadas

1. Separar os fluxos históricos de `app.js` do fluxo atual. Há funções de protocolos antigos ainda carregadas; a separação deve manter migrações e arquivos anteriores testados.
2. Migrar o armazenamento para IndexedDB se o volume de avaliações crescer. Hoje cada salvamento serializa a coleção inteira em localStorage; isso merece medição com históricos grandes antes de alterar a persistência.
3. Configurar execução automática dos testes a cada alteração no GitHub. Os testes de navegador ainda precisam de um caminho Playwright portátil e instalação documentada para CI.
4. Apresentar o histórico no PDF em tabelas legíveis, preservando o JSON integral. Atualmente parte das evidências técnicas é impressa como JSON, o que aumenta o número de páginas.

Esta revisão cobre o código próprio e os fluxos testados. Não representa auditoria de segurança da biblioteca PDF de terceiros nem validação psicométrica da matriz.
