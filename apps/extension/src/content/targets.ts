// Targets WhatsApp Web personal/Business: mismo origen web.whatsapp.com.
// Sin host_permissions en v1 (activeTab tras gesto). Fail-closed si el DOM cambia.
export const WA_URL_RE = /^https:\/\/web\.whatsapp\.com\//;

export function isSupportedUrl(url: string): boolean {
  return WA_URL_RE.test(url);
}

// Selectores del composer por orden de preferencia; si ninguno existe → 'no-composer' → pegado manual.
export const COMPOSER_SELECTORS = [
  '[contenteditable="true"][data-tab]',
  '[contenteditable="true"]',
];

export function composerLookupCode(): string {
  return `(function(){for(const s of ${JSON.stringify(COMPOSER_SELECTORS)}){const el=document.querySelector(s);if(el){return 'found:'+s;}}return 'no-composer';})()`;
}
