# 4. Estructura del repositorio

Monorepo Bun/TypeScript centrado en una extensión Chrome Manifest V3. No se incluye workspace Rust/Cargo en la arquitectura actual.

```text
ezzy/
├── apps/
│   └── extension/
│       ├── manifest/             # configuración MV3 por entorno
│       └── src/
│           ├── background/       # service worker, commands, messaging
│           ├── content/          # integración explícita con WhatsApp Web
│           ├── popup/            # búsqueda/activación rápida
│           ├── options/          # catálogo, mensajes, IA, sync, privacidad
│           └── shared/           # UI y adaptadores compartidos
├── packages/
│   ├── domain/                   # entidades y reglas TypeScript puras
│   ├── contracts/                # schemas DTO local/remoto versionados
│   ├── storage/                  # repositorios IndexedDB/chrome.storage
│   ├── ai-opencode/              # adapter aislado de API OpenCode
│   ├── sync-client/              # outbox, cursor y conflictos
│   ├── ui/                       # componentes shadcn/ui compartidos
│   └── test-fixtures/            # datos sintéticos solamente
├── services/
│   └── sync-api/                 # API privada Cloudflare, si free tier verificado
├── docs/sdd/
├── package.json
├── bun.lock
└── bunfig.toml
```

## Reglas

- Dominio no importa APIs `chrome.*`; adaptadores implementan puertos definidos por paquetes.
- Content scripts no importan repositorios ni cliente de IA; comunican solicitudes pequeñas al service worker.
- Cada mensaje entre contextos tiene schema, versión, tamaño y origen esperado.
- Permisos del manifest se justifican individualmente y se mantienen mínimos.
- Cada paquete representa una capacidad con responsable claro; evitar carpetas cajón.
- Fixtures ficticios: nunca usar chats reales.
- Bun administra workspaces TS; no hay Cargo workspace en esta arquitectura browser-only.
- Dividir módulos por capacidad y evitar componentes que mezclen catálogo, IA, WhatsApp y sync.
