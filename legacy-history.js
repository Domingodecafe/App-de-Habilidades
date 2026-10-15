import {escapeHTML as esc} from './core.js';
// Read-only, loaded only when a professional explicitly requests old records.
export function legacyHistoryView(a){
 const records={protocol:a.previousProtocol||a.protocol,interview:a.interview,verbal:a.verbal,practical:a.practical,sondagensIntegradas:Object.fromEntries(Object.entries(a.integrated.records).filter(([id])=>id.startsWith('R')))};
 return '<h2>Histórico da versão anterior</h2><p>Registros preservados; suas pontuações não alimentam o perfil reduzido. Consulta sem edição.</p><pre class="records">'+esc(JSON.stringify(records,null,2))+'</pre>';
}
