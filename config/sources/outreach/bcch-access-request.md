# Access request — Banco Central de Chile

**Status: draft, not sent.** Covers [`bcch-web`](../records/bcch-web.md). The statistics API ([`bcch-bde`](../records/bcch-bde.md)) needs no allowlisting, only a registered token. Fill the placeholders (table at the end) before sending.

## Where to send

| Route | Address | Evidence |
| --- | --- | --- |
| Primary | **Contacto Central** form on www.bcentral.cl (the bank's stated route for general inquiries) | Bank's *Contacto Central* page |
| Alternative / Cc | `comunicaciones@bcentral.cl` (press and media office; the request concerns access to its press communications) | Spanish contact page |
| Phone fallback | (+56) 22 670 2000 | Contact page |

The contact pages are behind the same JavaScript check as the rest of the site; they open normally in a regular browser. Send the Spanish version; the English version is a reference translation.

---

## Versión en español (para enviar)

**Asunto:** Solicitud de acceso automatizado de baja frecuencia a www.bcentral.cl (lista de permitidos) y consulta sobre canales de distribución de comunicados

Estimados señores:

Me dirijo a ustedes en nombre de [ORGANIZACIÓN] para solicitar su orientación y, de ser posible, la inclusión en la lista de permitidos de un sistema de consulta automatizada de baja frecuencia al sitio www.bcentral.cl.

**Contexto.** Estamos desarrollando una herramienta privada de investigación económica, de uso interno, que hace seguimiento a las publicaciones oficiales del Banco Central de Chile: comunicados de las Reuniones de Política Monetaria y Financiera, notas de prensa, presentaciones de autoridades, el Informe de Política Monetaria (IPoM) y el Informe de Estabilidad Financiera (IEF). Conforme a sus Condiciones de uso, el material se utiliza sin alteraciones, para uso interno y citando siempre la fuente con enlace; la herramienta no republica ni redistribuye los contenidos. Para datos estadísticos utilizaremos la API de la Base de Datos Estadísticos, de acuerdo con sus términos.

**Situación actual.** Durante pruebas iniciales el 17 de noviembre de 2026, todas las páginas HTML de www.bcentral.cl que consultamos —listados de prensa, comunicados, condiciones de uso— respondieron con una verificación en JavaScript de Imperva (Incapsula), que nuestro sistema no ejecuta. Los documentos PDF publicados bajo `/documents/` sí son accesibles. No intentamos resolver ni evadir esa verificación; por eso les escribimos.

**Qué consultaríamos**

- Las secciones de Prensa (comunicados RPM y RPF, notas de prensa, presentaciones) y de publicaciones (IPoM, IEF), y los documentos PDF enlazados desde ellas.
- Respetaríamos su robots.txt, que excluye el buscador y las rutas que contienen `reunion-de-politica-monetaria-rpm`.
- Agente de usuario (User-Agent): `[USER-AGENT]`
- Dirección IP de salida: [IP DE SALIDA]
- Frecuencia: como máximo una ronda por hora, con un mínimo de 10 segundos entre solicitudes y un tope de 10 solicitudes por ronda, es decir, 240 solicitudes diarias como máximo; en la práctica, menos, porque solo se descargan los documentos nuevos. Una única carga inicial del último mes requeriría a lo sumo unas 60 solicitudes adicionales, repartidas en varias horas.
- Si el sitio responde con una verificación anti-bots, el sistema se detiene y no intenta resolverla ni evadirla.

**Solicitudes**

1. ¿Podrían incluir el agente de usuario y la dirección IP indicados en la lista de permitidos de su protección anti-bots? Si prefieren otro mecanismo de identificación, con gusto lo adoptamos.
2. ¿Existe un feed RSS o Atom, una API o una suscripción en formato estructurado para los comunicados y publicaciones? Si existe, lo usaríamos en lugar de consultar las páginas.
3. Su robots.txt excluye las rutas que contienen `reunion-de-politica-monetaria-rpm`. ¿Esa exclusión busca que los sistemas automatizados no consulten los comunicados de las Reuniones de Política Monetaria? En ese caso, ¿existe un canal autorizado para recibirlos?

Quedo atento a sus comentarios y a su disposición para cualquier aclaración técnica.

Saludos cordiales,

[NOMBRE]
[CARGO], [ORGANIZACIÓN]
[CORREO] · [TELÉFONO]

---

## Versión breve para formulario web

> Solicitamos incluir en la lista de permitidos de su protección anti-bots (Imperva/Incapsula) un sistema de consulta automatizada de baja frecuencia a www.bcentral.cl: secciones de Prensa (comunicados RPM y RPF, notas de prensa, presentaciones) e IPoM/IEF, y sus PDF. Es una herramienta privada de investigación de uso interno de [ORGANIZACIÓN]; usa el material sin alteraciones, cita la fuente con enlace y no lo redistribuye. Ritmo: máximo 10 solicitudes por hora, con 10 segundos entre solicitudes; respetaremos su robots.txt. User-Agent: [USER-AGENT]. IP: [IP DE SALIDA]. En pruebas del 17/11/2026 todas las páginas HTML respondieron con la verificación en JavaScript; no intentamos evadirla. También agradeceríamos saber si existe un feed RSS, una API o una suscripción estructurada para comunicados, y si la exclusión de las rutas "reunion-de-politica-monetaria-rpm" en su robots.txt alcanza a los comunicados RPM. Contacto: [NOMBRE], [CORREO].

---

## English version (reference translation)

**Subject:** Request for low-frequency automated access to www.bcentral.cl (allowlisting) and question about distribution channels for press releases

Dear Sir or Madam,

I am writing on behalf of [ORGANIZATION] to ask for your guidance and, if possible, for a low-frequency automated collection system to be allowlisted on www.bcentral.cl.

**Context.** We are building a private, internal economic research tool that follows Banco Central de Chile's official publications: statements from the Monetary and Financial Policy Meetings, press notes, presentations by authorities, the Monetary Policy Report (IPoM), and the Financial Stability Report (IEF). In line with your Terms of Use, material is used unaltered, for internal purposes, always citing the source with a link; the tool does not republish or redistribute content. For statistical data we will use the Statistical Database API under its terms.

**Current situation.** During initial tests on Nov. 17, 2026, every HTML page we requested on www.bcentral.cl — press listings, press releases, the terms of use — answered with an Imperva (Incapsula) JavaScript check, which our system does not execute. PDF documents under `/documents/` are accessible. We did not try to solve or evade the check, which is why we are writing.

**What we would access**

- The Press sections (Monetary and Financial Policy Meeting statements, press notes, presentations) and publications (IPoM, IEF), and the PDF documents they link to.
- We would honor your robots.txt, which excludes the site search and paths containing `reunion-de-politica-monetaria-rpm`.
- User-Agent: `[USER-AGENT]`
- Outbound IP address: [OUTBOUND IP]
- Rate: at most one round per hour, at least 10 seconds between requests, and no more than 10 requests per round — 240 requests a day at most, fewer in practice because only new documents are downloaded. A one-time load of the last month would take at most about 60 additional requests spread over several hours.
- If the site answers with a bot-protection challenge, the system stops and does not try to solve or evade it.

**Requests**

1. Could you allowlist the User-Agent and IP address above in your bot protection? If you prefer another identification mechanism, we will gladly adopt it.
2. Is there an RSS or Atom feed, an API, or a structured subscription for press releases and publications? If so, we would use it instead of requesting pages.
3. Your robots.txt excludes paths containing `reunion-de-politica-monetaria-rpm`. Is that exclusion meant to keep automated systems away from Monetary Policy Meeting statements? If so, is there an authorized channel for receiving them?

I look forward to your reply and am available for any technical questions.

Kind regards,

[NAME]
[TITLE], [ORGANIZATION]
[EMAIL] · [PHONE]

---

## Placeholders

| Placeholder | Fill with |
| --- | --- |
| `[ORGANIZACIÓN]`, `[NOMBRE]`, `[CARGO]`, `[CORREO]`, `[TELÉFONO]` | The requester's details |
| `[USER-AGENT]` | Same string as in the Banco de la República request, e.g. `dottext-collector/0.1 (+mailto:[CORREO])`, set with `DOTTEXT_USER_AGENT` |
| `[IP DE SALIDA]` | A fixed outbound IP (Cloud NAT with a reserved static address). If it is not ready, replace the line with: *"Les comunicaremos la dirección IP fija de salida antes de iniciar la consulta regular."* and delete IP from the form version. |

The `bcch-web` connector is not built yet; its planned limits (10 s spacing, 10 requests/run, robots.txt exclusions) are commitments it must implement. The 240/day ceiling follows from those limits; the backfill figure is an estimate. Revise both once the connector exists.
