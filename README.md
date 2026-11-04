# NormBuild Frontend

Responsive Vue 3 application for Spanish-language, source-grounded building
regulation guidance. The interface performs project text validation in a Web
Worker and receives progressive analysis events from the API.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- NormBuild backend running on port 8080 by default

## Local setup

1. Copy `.env.example` to `.env` if the API is running at a different address.
2. Install dependencies with `npm ci`.
3. Start the development server with `npm run dev`.
4. Run `npm test` and `npm run build` before submitting changes.

## Production deployment on the backend host

The frontend is independently built and served from this repository. On the
same Linux Docker host as the backend, create the shared network once with
`docker network create normbuild-edge`. Create `.env.production` from
`.env.production.example`, point `PUBLIC_DOMAIN` to a DNS name that resolves to
the host, then deploy:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Caddy obtains and renews the public TLS certificate. The browser uses the
same-origin `/api` path; Nginx proxies the stream to the independently deployed
backend container and disables buffering so progress arrives incrementally.
Keep ports 80 and 443 open on the host firewall. Do not expose the database or
Ollama ports publicly.

The development proxy sends `/api` requests to `NORMBUILD_BACKEND_URL`. In
production, `/api` remains same-origin and the Nginx service proxies it to the
backend container.
The first render always uses light mode. User-facing copy is Spanish; source
identifiers and comments are English.

## Main workflows

- Enter a jurisdiction and describe a building proposal.
- Review calculated proposal areas and indices as soon as analysis starts.
- Read a Spanish checklist grounded in retrieved regulatory documents.
- Open the official source link and expand its complete indexed text.
- Review explicit missing-source and unavailable-model states.
## Deployment preflight

Before deployment, copy the production environment template to .env.production,
set a real public DNS name and unique strong secrets, then run:

    .\scripts\verify-production.ps1 -EnvironmentFile .\.env.production

After both services are running, use the following command to verify DNS, HTTPS,
the certificate, the public API route and indexed sources for all seven cities:

    .\scripts\verify-production.ps1 -EnvironmentFile .\.env.production -VerifyRunningStack -RequireSevenCityCoverage

The seven-city check intentionally fails until official source documents have
been reviewed and indexed. It checks source counts; it does not certify legal
currency or parcel-level applicability.
