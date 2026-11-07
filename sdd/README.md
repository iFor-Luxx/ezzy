# Ezzy — Software Design Description

**Estado:** borrador de diseño para revisión antes de implementar  
**Versión:** 0.1.0 · **Fecha:** 2026-11-04  
**Idioma:** español

Este directorio describe el producto, sus límites, arquitectura y criterios de aceptación. No constituye código ni autoriza despliegues. Las decisiones marcadas como pendientes se deben resolver antes de cerrar el diseño correspondiente.

## Lectura sugerida

1. [Visión general](01-overview.md)
2. [Requisitos](02-requirements.md)
3. [Arquitectura](03-architecture.md) y [estructura del monorepo](04-repository-structure.md)
4. [Backend](05-backend.md), [datos](06-database-schema.md), [contratos](07-api-contracts.md)
5. [IA](08-ai-engine.md), [extensión de navegador](09-browser-extension.md), [Chrome y WhatsApp](10-chrome-whatsapp.md)
6. [Sincronización y modo offline](11-sync-offline.md), [seguridad](12-security-privacy.md)
7. [Pruebas y aceptación](13-testing-acceptance.md), [despliegue y costo](14-deployment-cost.md)
8. [Roadmap](15-roadmap.md), [ADRs](16-adrs.md), [glosario](17-glossary.md)

## Convenciones

- **MUST / DEBE** indica requisito obligatorio; **SHOULD / DEBERÍA**, recomendación; **MAY / PUEDE**, opción.
- “Nube” significa únicamente recursos gratuitos autorizados de Cloudflare. No se contempla almacenar medios en ella.
- Los límites y cuotas de planes gratuitos son variables: se deben comprobar antes de cada diseño de despliegue. Este documento no promete que una cuota determinada sea permanente.
- Cualquier operación con posibilidad de consumir un servicio pagado se bloquea de forma predeterminada. No se habilitan facturación, recargas, overages, Workers Paid, R2 de pago ni servicios externos con costo.

## Índice de decisiones abiertas

Proveedor de autenticación y recuperación de cuenta; selección final de servicios Cloudflare y sus cuotas vigentes; estrategia de sincronización entre equipos; proveedor/modelo y formato de API de OpenCode; restricciones de Chrome para comandos y permisos; resolución de conflictos; política de datos de clientes. Véanse los documentos pertinentes.
