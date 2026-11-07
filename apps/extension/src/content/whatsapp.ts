// Content script WhatsApp Web — solo bajo demanda tras gesto explícito.
// Sin polling, sin lectura continua, sin envío. Inserta texto en composer tras confirmación.
export function buildInsertScript(text: string): string {
  // Se inyecta con scripting.executeScript; mundo ISOLATED. Dispara input para que React lo registre.
  const safe = JSON.stringify(text);
  return `(function(){const t=${safe};const el=document.querySelector('[contenteditable="true"][data-tab]')||document.querySelector('[contenteditable="true"]');if(!el){return 'no-composer';}el.focus();document.execCommand('insertText',false,t);el.dispatchEvent(new InputEvent('input',{bubbles:true}));return 'ok';})()`;
}

export function validateInsertText(text: string): { ok: boolean; reason?: string } {
  if (!text || text.trim().length === 0) return { ok: false, reason: "vacío" };
  if (text.length > 4000) return { ok: false, reason: "texto >4000" };
  return { ok: true };
}
