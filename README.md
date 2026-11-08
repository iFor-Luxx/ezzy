<div align="center">

# Ezzy

[![bun](https://img.shields.io/badge/bun-1.4.4-black?logo=bun)](https://bun.sh)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![web](https://img.shields.io/badge/web-React%20%2B%20Vite-3178c6)](./apps/web)
[![extension](https://img.shields.io/badge/extension-Chrome%20MV3-orange)](./apps/extension)
[![platforms](https://img.shields.io/badge/Panel_%7C_Extensi%C3%B3n-local--first-615fff)](./sdd/README.md)

**Tu catálogo privado para vender por WhatsApp.**\
Panel local + extensión de Chrome: marcas, precios por cantidad, mensajes aprobados y contexto anonimizado. Nada se envía solo.

[Diseño (sdd)](./sdd/README.md) · [Quickstart](#quickstart) · [Estructura](#estructura) · [Roadmap](#roadmap)

</div>

![Ezzy — catálogo privado](./Frame%202.webp)

> Fuente de verdad del diseño: [`sdd/`](./sdd/README.md) (caps `01`–`17`).

---

## Qué es

- **Catálogo por marcas:** UOMO CATTIVO, EZZETA, MAXETA y CREPANTE. Cada prenda con nombre, tela y precios por cantidad (1, 2, 3, 4, 6, 12…).
- **Mejorar con IA:** describe el material con sus beneficios reales en una frase corta, sin emojis. La key vive solo en la sesión y nunca va a logs.
- **Mensajes aprobados:** plantillas con `{{variables}}` y favoritos 1-3. Se revisan antes de copiar; la extensión nunca envía sola.
- **Contexto anonimizado:** el fragmento se anonimiza en tu navegador antes de usarse. Imágenes bloqueadas.
- **Puente con la extensión:** exportas el JSON del panel y lo importas en Opciones de la extensión. Manual y explícito.
- **Respaldo + auditoría:** export completo local y registro de qué pasó y cuándo, sin texto sensible.
- **Eliminar con confirmación:** para borrar una prenda hay que escribir su nombre exacto.

## Stack

| Capa | Tech |
|---|---|
| Monorepo | Bun workspaces, TypeScript |
| Web | React + Vite + Tailwind v4 (oklch) + shadcn + lucide-react |
| Extensión | Chrome MV3, offline-first (selector, favoritos, copiar/insertar tras confirmar) |
| Backend | `services/sync-api` + `@ezzy/contracts` + `@ezzy/sync-client` |
| Datos | `localStorage` del panel + puente JSON manual hacia la extensión |
| IA | OpenCode inference para mejorar descripciones (key de sesión, confirmación previa) |
| Calidad | `bun test` + `tsc --noEmit` |

Identidad visual: Inter / Geist, estilo iOS — tarjetas agrupadas, hairlines, superficies translúcidas.

## Estructura

```text
apps/web/            # Panel privado React+Vite+TS
apps/extension/      # Extensión Chrome MV3 (popup, content, options, background)
services/sync-api/   # API de sincronización
packages/domain/      # dominio puro (anonimizado, reglas)
packages/contracts/  # contratos compartidos panel ↔ sync-api
packages/sync-client/# cliente de sincronización
packages/storage/    # persistencia local
packages/ai-opencode/# cliente IA (ping, modelos, streaming)
packages/ui/         # componentes compartidos
packages/test-fixtures/
sdd/                 # diseño 01–17 + README
```

## Principios duros

- **Local-first:** tus datos quedan en este navegador salvo que exportes el puente.
- **Nada se envía solo:** copiar/insertar siempre tras tu confirmación.
- **Key de sesión:** se borra al cerrar; nunca en logs, sync ni respaldo.
- **Anonimizar antes de transmitir:** el contexto se redacta en local y se previsualiza.
- **Borrado explícito:** eliminar una prenda exige escribir su nombre.

## Quickstart

Requisitos: [Bun](https://bun.sh) 1.4.4+.

```sh
bun install

bun run dev          # panel local (apps/web)
bun run build:web    # vite build del panel
bun run build:extension  # build de la extensión
bun run test         # bun test ./packages/...
bun run test:all     # + apps
bun run typecheck    # tsc --noEmit
```

Acceso al panel: URL del Worker + PIN. La URL se configura en la propia app.

## Documentación

- Diseño completo: [`sdd/README.md`](./sdd/README.md) + caps `01`–`17` (requisitos, arquitectura, backend, esquema DB, contratos API, IA, extensión, WhatsApp, sync offline, seguridad, testing, deploy, roadmap, ADRs, glosario).

## Roadmap

Ver [`sdd/15-roadmap.md`](./sdd/15-roadmap.md) y decisiones en [`sdd/16-adrs.md`](./sdd/16-adrs.md).

## Licencia

MIT — ver [LICENSE](./LICENSE). © 2026 iFor-Luxx
