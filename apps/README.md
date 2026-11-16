# Deployable applications

Build three applications with independent deployment configuration. Apps own transports, framework wiring, and dependency composition; shared packages own reusable business logic.

| App | Responsibility |
| --- | --- |
| [portal](portal/README.md) | Private UI and research control routes |
| [content-api](content-api/README.md) | Content platform API and permission-filtered retrieval |
| [worker](worker/README.md) | Collection, resumable processing, workflow execution |

Read [architecture](../docs/architecture.md) before wiring service access. Authentication, cost reservations, request IDs, durable job status, and error reporting must be present for each applicable path.
