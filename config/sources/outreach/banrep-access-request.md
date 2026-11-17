# Access request — Banco de la República

**Status: draft, not sent.** Covers [`banrep-web`](../records/banrep-web.md) and [`banrep-repositorio`](../records/banrep-repositorio.md). Fill the placeholders (table at the end) before sending.

## Where to send

| Route | Address | Evidence |
| --- | --- | --- |
| Primary | `atencionalciudadano@banrep.gov.co`, or the electronic form under **Atención a la ciudadanía** on banrep.gov.co (registers it as a formal request in the citizen-service system, SAC) | Address cited in a Banco de la República publication; confirm it on the *Atención a la ciudadanía* page before sending |
| Cc | `CAIE-Soluciones@banrep.gov.co` | Administrator address published in the repository's own OAI-PMH `Identify` response (seen 2026-11-17) |
| Phone fallback | SAC: 01 8000 911745 (national, toll-free); +57 (601) 484-9980 ext. 1011 (Bogotá) | Bank's *Atención telefónica* page |

Send the Spanish version. The English version below is a reference translation.

---

## Versión en español (para enviar)

**Asunto:** Solicitud de acceso automatizado de baja frecuencia a banrep.gov.co y repositorio.banrep.gov.co (lista de permitidos)

Estimados señores:

Me dirijo a ustedes en nombre de [ORGANIZACIÓN] para solicitar su orientación y, de ser posible, la inclusión en la lista de permitidos de un sistema de consulta automatizada de baja frecuencia a los sitios www.banrep.gov.co y repositorio.banrep.gov.co.

**Contexto.** Estamos desarrollando una herramienta privada de investigación económica, de uso interno, que hace seguimiento a las publicaciones oficiales del Banco de la República: comunicados de prensa, decisiones y minutas de la Junta Directiva, el Informe de Política Monetaria y los informes publicados en el repositorio institucional. La herramienta no republica ni redistribuye los contenidos; los utiliza para consulta interna y cita cada documento con enlace a su página original.

**Qué consultamos**

- En www.banrep.gov.co: los listados `/es/noticias` y `/en/press-releases` y las páginas de los comunicados enlazados desde ellos. No usamos el buscador del sitio, y las rutas que consultamos no están restringidas por su robots.txt.
- En repositorio.banrep.gov.co: la interfaz OAI-PMH (`/server/oai/request`, verbos `ListRecords` y `GetRecord`, formatos `oai_dc` y `ore`), pidiendo únicamente los registros modificados desde la consulta anterior.

**Cómo consultamos**

- Agente de usuario (User-Agent): `[USER-AGENT]`
- Dirección IP de salida: [IP DE SALIDA]
- Frecuencia: como máximo una ronda por hora, con un mínimo de 10 segundos entre solicitudes y un tope de 10 solicitudes por ronda en cada sitio. En la práctica, unas 65 solicitudes diarias al sitio web y unas 25 al repositorio. Una única carga inicial del último mes requeriría unas 80 solicitudes adicionales, repartidas en varias horas.
- Si el sitio responde con una verificación anti-bots, el sistema se detiene y no intenta resolverla ni evadirla.

**Situación actual.** Durante pruebas iniciales el 17 de noviembre de 2026, tras unas pocas solicitudes con el agente de usuario identificado y un espaciamiento de al menos 4 segundos, tanto el sitio como el repositorio comenzaron a responder con la verificación de Radware Bot Manager. Por esa razón les escribimos antes de iniciar la consulta regular.

**Solicitudes**

1. ¿Podrían incluir el agente de usuario y la dirección IP indicados en la lista de permitidos de su protección anti-bots, para ambos sitios? Si prefieren otro mecanismo de identificación, con gusto lo adoptamos.
2. Si existe un canal preferido para este tipo de consulta —por ejemplo, un feed RSS o Atom de comunicados, una API o una franja horaria determinada—, les agradecería indicárnoslo. Ajustaremos el método y la frecuencia a sus indicaciones.
3. El robots.txt del repositorio excluye la ruta `/server`, donde se encuentra la interfaz OAI-PMH. ¿Es aceptable la recolección por OAI-PMH a la frecuencia descrita?
4. Su Aviso Legal indica que la reproducción de los contenidos requiere autorización o una excepción legal. Les agradecería confirmar si almacenar el texto de los comunicados y publicaciones para consulta interna, citando siempre la fuente con enlace, es compatible con el Aviso Legal, o indicarnos el procedimiento para solicitar la autorización correspondiente.

Quedo atento a sus comentarios y a su disposición para cualquier aclaración técnica.

Cordialmente,

[NOMBRE]
[CARGO], [ORGANIZACIÓN]
[CORREO] · [TELÉFONO]

---

## Versión breve para formulario web

> Solicitamos incluir en la lista de permitidos de su protección anti-bots (Radware) un sistema de consulta automatizada de baja frecuencia a www.banrep.gov.co (listados /es/noticias y /en/press-releases y sus comunicados) y a la interfaz OAI-PMH de repositorio.banrep.gov.co. Es una herramienta privada de investigación de uso interno de [ORGANIZACIÓN]; no republica contenidos y cita la fuente con enlace. Ritmo: máximo 10 solicitudes por hora por sitio, con 10 segundos entre solicitudes (unas 90 diarias en total). User-Agent: [USER-AGENT]. IP: [IP DE SALIDA]. En pruebas del 17/11/2026 recibimos la verificación anti-bots tras pocas solicitudes; no intentamos evadirla. También agradeceríamos saber si existe un feed RSS o una API preferida, si la recolección OAI-PMH es aceptable (el robots.txt del repositorio excluye /server) y si el almacenamiento interno del texto, con cita y enlace, es compatible con su Aviso Legal. Contacto: [NOMBRE], [CORREO].

---

## English version (reference translation)

**Subject:** Request for low-frequency automated access to banrep.gov.co and repositorio.banrep.gov.co (allowlisting)

Dear Sir or Madam,

I am writing on behalf of [ORGANIZATION] to ask for your guidance and, if possible, for a low-frequency automated collection system to be allowlisted on www.banrep.gov.co and repositorio.banrep.gov.co.

**Context.** We are building a private, internal economic research tool that follows Banco de la República's official publications: press releases, Board of Directors decisions and minutes, the Monetary Policy Report, and reports in the institutional repository. The tool does not republish or redistribute content; it uses it for internal reference and cites every document with a link to its original page.

**What we access**

- On www.banrep.gov.co: the `/es/noticias` and `/en/press-releases` listings and the press-release pages they link to. We do not use the site search, and the paths we request are not restricted by your robots.txt.
- On repositorio.banrep.gov.co: the OAI-PMH interface (`/server/oai/request`, `ListRecords` and `GetRecord` verbs, `oai_dc` and `ore` formats), requesting only records modified since the previous run.

**How we access it**

- User-Agent: `[USER-AGENT]`
- Outbound IP address: [OUTBOUND IP]
- Rate: at most one round per hour, at least 10 seconds between requests, and no more than 10 requests per round per site — in practice about 65 requests a day to the website and about 25 to the repository. A one-time load of the last month would take about 80 additional requests spread over several hours.
- If the site answers with a bot-protection challenge, the system stops and does not try to solve or evade it.

**Current situation.** During initial tests on Nov. 17, 2026, after a few requests with the identified User-Agent and at least 4 seconds between requests, both the website and the repository began answering with the Radware Bot Manager challenge. That is why we are writing before starting regular collection.

**Requests**

1. Could you allowlist the User-Agent and IP address above in your bot protection for both sites? If you prefer another identification mechanism, we will gladly adopt it.
2. If there is a preferred channel for this kind of access — for example, an RSS or Atom feed of press releases, an API, or a particular time window — please let us know. We will adjust our method and rate accordingly.
3. The repository's robots.txt excludes `/server`, where the OAI-PMH interface lives. Is OAI-PMH harvesting at the rate described acceptable?
4. Your Legal Notice says reproduction of content requires authorization or a legal exception. Please confirm whether storing the text of press releases and publications for internal reference, always citing the source with a link, is compatible with the Legal Notice, or tell us how to request the corresponding authorization.

I look forward to your reply and am available for any technical questions.

Sincerely,

[NAME]
[TITLE], [ORGANIZATION]
[EMAIL] · [PHONE]

---

## Placeholders

| Placeholder | Fill with |
| --- | --- |
| `[ORGANIZACIÓN]`, `[NOMBRE]`, `[CARGO]`, `[CORREO]`, `[TELÉFONO]` | The requester's details |
| `[USER-AGENT]` | The exact string the collector will send, with a contact, e.g. `dottext-collector/0.1 (+mailto:[CORREO])`. Set it with `DOTTEXT_USER_AGENT`; the built-in default has no contact. |
| `[IP DE SALIDA]` | A fixed outbound IP. Cloud Run has none by default; it needs Cloud NAT with a reserved static address (a recurring charge — see [decisions](../../../docs/decisions.md)). If it is not ready, replace the line with: *"Les comunicaremos la dirección IP fija de salida antes de iniciar la consulta regular."* and delete IP from the form version. |

Request volumes follow from the registry (`rateLimit`: 10 s spacing, 10 requests/run) and the pipeline's once-a-day correction recheck: website ≈ 24 runs × 2 listing pages + ~13 daily rechecks of items from the past week + new items ≈ 65; repository ≈ 24 `ListRecords` + an ORE request per changed record ≈ 25; one-month backfill ≈ 50 website + 30 repository requests. Update them if those settings change before sending.
