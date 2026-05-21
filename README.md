# Compliance Shield

AI-powered GitHub governance and compliance platform for engineering organizations.

Compliance Shield combines:

- Repository and pull request compliance scanning
- Secret detection and weak-cryptography checks
- AI-assisted security reviews and remediation suggestions
- Governance workflows with override audit trails
- Historical risk intelligence and usage metering
- Async queue-based processing (BullMQ + Redis)
- Multi-tenant analytics stored in PostgreSQL
- Executive governance dashboards

The app comments on pull requests, generates GitHub Check Runs, and can block merges when violations exceed your configured severity threshold.


## Features

### Pull request scanning

Automatically scans files changed in pull requests on `pull_request.opened` and `pull_request.synchronize` events.

Example checks include:

- Hardcoded passwords and API keys
- AWS credentials and private keys
- Weak cryptographic algorithms (MD5, DES, SHA1, RC4)
- Sensitive configuration and certificate files (`.pem`, `.pfx`, `.p12`, `id_rsa`)

When violations are detected, Compliance Shield posts a PR comment and updates a GitHub Check Run. Merge blocking is controlled by `minimumSeverityToFail`.

### Repository scanning

Scan the entire repository (subject to `maxRepositoryFiles`, `maxFileSizeKB`, and `ignorePaths` limits).

Trigger a repository scan by either:

- Adding `[scan-repo]` to the PR title, or
- Running `/compliance-shield scan-repo` in a PR comment

Large scans can be queued asynchronously via BullMQ when Redis is configured.

### Secret detection

Built-in patterns detect common secrets including:

- AWS access keys (`AKIA…`)
- GitHub personal access tokens (`ghp_…`)
- Private key blocks (`-----BEGIN … PRIVATE KEY-----`)
- Stripe live secret keys (`sk_live_…`)
- JWT tokens

You can extend detection with custom `secretPatterns` in your config file.

### Policy packs

Compliance Shield supports layered policy configuration.

**Built-in scan policies** (`policy` field):

| Policy | Description |
| --- | --- |
| `baseline` | Standard security checks (default rules) |
| `strict` | Strong enterprise policy with broader file/content indicators |
| `secrets-only` | Focus on secrets and credential files |
| `crypto` | Weak cryptography detection |

**Compliance framework packs** (`policyPack` field):

| Policy pack | Description |
| --- | --- |
| `soc2` | SOC 2-oriented secure development governance |
| `gdpr` | GDPR-focused data protection controls |
| `pci-dss` | PCI DSS payment security controls |
| `hipaa` | HIPAA healthcare data protection controls |
| `owasp` | OWASP application security controls |

Framework packs enable rule flags such as `blockSecrets`, `blockWeakCrypto`, `blockPII`, and `blockInsecureHeaders`.

### Autofix and AI assistance

When violations are found, Compliance Shield provides actionable suggestions. With AI enabled (`AI_ENABLED=true` and `OPENAI_API_KEY`), you can use:

- `/compliance-shield autofix` — AI-generated remediation suggestions per file
- `/compliance-shield explain` — AI review of current violations
- `/compliance-shield why-blocked` — governance copilot: why the PR is blocked
- `/compliance-shield explain-risk` — governance copilot: risk explanation
- `/compliance-shield top-risk` — governance copilot: top risk areas

The dashboard can also generate executive summaries per scan via `/api/metrics/scans/:id/summary`.

### Governance overrides

Authorized approvers can record time-bound compliance overrides:

```
/compliance-shield override reason:<reason> expires:30d
```

Overrides require admin permission and optionally must be listed in `governance.overrideApprovers`. Each override is written to the audit trail with risk score, reason, and expiry. Expired overrides are cleaned up by a scheduled workflow (`npm run build` + `node lib/scripts/expireOverrides.js`).

### Inline suppression

Suppress a specific line with an inline comment (default name: `compliance-shield-ignore`):

```typescript
const apiKey = "example"; // compliance-shield-ignore
```

Configure the marker via `inlineIgnoreComment` in your YAML config.


## Slash commands

Post these as comments on a pull request.

| Command | Description | Default permission |
| --- | --- | --- |
| `/compliance-shield` or `/compliance-shield help` | Show available commands | everyone |
| `/compliance-shield status` | Latest scan information | everyone |
| `/compliance-shield history` | Recent scan history | everyone |
| `/compliance-shield scan-repo` | Full repository scan | write |
| `/compliance-shield rescan` | Re-run PR compliance checks | write |
| `/compliance-shield explain` | AI explanation of violations | write |
| `/compliance-shield autofix` | AI autofix suggestions | write |
| `/compliance-shield why-blocked` | Governance copilot | write |
| `/compliance-shield explain-risk` | Governance copilot | write |
| `/compliance-shield top-risk` | Governance copilot | write |
| `/compliance-shield override reason:… expires:30d` | Record governance override | admin |

Permissions are configurable per command via `commandPermissions` (`everyone`, `write`, or `admin`).


## Configuration

Compliance Shield reads YAML from two optional locations (repo config overrides org config where fields overlap):

| File | Scope |
| --- | --- |
| `.compliance-shield.yml` | Repository-level |
| `.github/compliance-shield-org.yml` | Organization-level defaults |

### Example repository config

```yaml
policy: strict
policyPack: soc2
scanMode: full-file
minimumSeverityToFail: high

ignorePaths:
  - "node_modules/"
  - "lib/"
  - "coverage/"
  - ".git/"
  - "tests/**"

ignoreIndicators:
  - TODO_SECRET

inlineIgnoreComment: compliance-shield-ignore

maxRepositoryFiles: 300
maxFileSizeKB: 300
parallelFileFetchLimit: 10

bannedFileIndicators:
  - value: ".pem"
    severity: high

bannedContentIndicators:
  - value: "password="
    severity: high

secretPatterns:
  - name: "AWS Access Key"
    pattern: "AKIA[0-9A-Z]{16}"
    severity: high

commandPermissions:
  help: everyone
  status: everyone
  scan-repo: write
  rescan: write

governance:
  overrideApprovers:
    - "security-team-lead"
  requireOverrideReason: true
```

### Configuration reference

| Field | Type | Description |
| --- | --- | --- |
| `policy` | `baseline` \| `strict` \| `secrets-only` \| `crypto` | Built-in rule set |
| `policyPack` | `soc2` \| `gdpr` \| `pci-dss` \| `hipaa` \| `owasp` | Compliance framework pack |
| `scanMode` | `diff` \| `full-file` | Scan PR diff only or full file content |
| `minimumSeverityToFail` | `low` \| `medium` \| `high` \| `critical` | Lowest severity that fails the check |
| `bannedFileIndicators` | array | Filename/path substring rules |
| `bannedContentIndicators` | array | Content substring rules |
| `secretPatterns` | array | Named regex secret detectors |
| `ignorePaths` | string[] | Glob paths to skip |
| `ignoreIndicators` | string[] | Indicators to ignore globally |
| `inlineIgnoreComment` | string | Inline suppression marker |
| `maxRepositoryFiles` | number | Cap for repo-wide scans |
| `maxFileSizeKB` | number | Skip files larger than this |
| `parallelFileFetchLimit` | number | Concurrent GitHub file fetches |
| `commandPermissions` | object | Per-command access level |
| `governance.overrideApprovers` | string[] | GitHub users allowed to override |
| `governance.requireOverrideReason` | boolean | Require reason in override command |

Scan metadata can also be persisted in the repository at:

- `.github/compliance-shield-state.json`
- `.github/compliance-shield-history.json`


## Example pull request report

Compliance Shield posts a comment on the PR:

```markdown
🛡️ Compliance Shield

PR: #42
Files scanned: 8
Violations found: 1

HIGH SECRET
AWS Access Key detected

Suggested fix:
Rotate the credential and store it in a secret manager.
```


## Architecture

```
GitHub Webhooks
      │
      ▼
Express + Probot (server.ts)
      │
      ├──► Pull Request Handler ──► Scan Engine ──► Rule Engine
      │                                      │
      │                                      ▼
      │                            Violation Reporter
      │                                      │
      │                                      ▼
      │                         PR Comment + GitHub Check Run
      │
      ├──► Comment Command Handler (slash commands, AI, overrides)
      │
      ├──► BullMQ Scan Queue ──► scanWorker (async repo scans)
      │
      └──► REST API ──► Governance Dashboard (React + Vite)

PostgreSQL ── metrics, violations, overrides, usage events
Redis ── BullMQ job queue
```

**Key components**

| Component | Role |
| --- | --- |
| `pullRequestHandler` | PR and optional repo scans on webhook events |
| `commentCommandHandler` | Slash commands, AI, governance overrides |
| `ruleEngine` | Evaluates indicators, secrets, and severity |
| `scanService` / `repositoryScanner` | File fetching and scanning orchestration |
| `configLoader` | Merges org/repo YAML with policy packs |
| `metricsService` | Persists scan metrics to PostgreSQL |
| `overrideAuditService` | Governance override audit trail |
| `usageMeteringService` | Usage events for billing/analytics |
| `dashboardMetricsService` | Aggregations for the governance dashboard |


## Governance dashboard

A React dashboard (`dashboard/`) visualizes org-wide security posture.

**Panels include:** scan summary, severity breakdown, risk analytics, repository leaderboard, organization posture score, override governance summary, governance debt score, repository risk learning (trends, recurring violations, drift), and usage metering summary.

### Run the dashboard locally

```bash
# Terminal 1 — API server (includes Probot webhooks)
npm install
npm run build
npm run migrate
npm start

# Terminal 2 — dashboard UI
cd dashboard
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:3000` in `dashboard/.env` (or rely on the default). Ensure `CORS_ORIGIN` on the server includes `http://localhost:5173`.


## REST API

When `METRICS_ENABLED=true` and `DATABASE_URL` is set, the server exposes:

| Endpoint | Description |
| --- | --- |
| `GET /health` | Liveness / dependency health |
| `GET /ready` | Readiness probe |
| `GET /api/metrics/summary` | Dashboard summary totals |
| `GET /api/metrics/scans` | Recent scans (`?limit=20`) |
| `GET /api/metrics/scans/:id` | Scan detail with violations |
| `GET /api/metrics/scans/:id/summary` | AI executive summary for a scan |
| `GET /api/metrics/repos` | Per-repository summary |
| `GET /api/metrics/trends` | Scan trends (`?days=14`) |
| `GET /api/metrics/severity` | Severity distribution |
| `GET /api/metrics/risk` | Repository risk scores |
| `GET /api/metrics/repo-leaderboard` | Risk-ranked repositories |
| `GET /api/metrics/org-posture` | Organization governance posture |
| `GET /api/metrics/overrides` | Recent override audits |
| `GET /api/metrics/override-summary` | Active/expired override counts |
| `GET /api/metrics/governance-debt` | Governance debt score |
| `GET /api/metrics/repo-risk-learning` | Risk trends and recurring violations |
| `GET /api/metrics/usage-summary` | Usage metering by event type |

GitHub webhooks are served at `POST /api/github/webhooks`.


## Environment variables

Create a `.env` file in the project root (see `.env.example` if present, or use the table below).

| Variable | Required | Description |
| --- | --- | --- |
| `APP_ID` | Yes | GitHub App ID |
| `PRIVATE_KEY` | Yes | GitHub App private key (PEM) |
| `WEBHOOK_SECRET` | Yes | GitHub webhook secret |
| `DATABASE_URL` | For metrics | PostgreSQL connection string (e.g. Neon) |
| `METRICS_ENABLED` | No | Set to `true` to enable PostgreSQL metrics |
| `REDIS_URL` | For queue | Redis URL for BullMQ async scans |
| `AI_ENABLED` | No | Enable OpenAI-powered features |
| `OPENAI_API_KEY` | If AI | OpenAI API key |
| `OPENAI_MODEL` | No | Model name (default: `gpt-4o-mini`) |
| `PORT` | No | HTTP port (default: `3000`) |
| `CORS_ORIGIN` | No | Comma-separated allowed dashboard origins |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |
| `NODE_ENV` | No | `development` or `production` |
| `SENTRY_DSN` | No | Sentry error reporting |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Sentry trace sample rate (default: `0.1`) |

**Scheduled scan workflow** (`.github/workflows/compliance-shield-scan.yml`) additionally uses:

- `INSTALLATION_ID`
- `SCHEDULED_SCAN_OWNER`
- `SCHEDULED_SCAN_REPO`
- `SCHEDULED_SCAN_DEFAULT_BRANCH`

Store these as GitHub Actions secrets (`COMPLIANCE_SHIELD_*`).


## GitHub App setup

1. Create a GitHub App with webhook URL `https://<your-host>/api/github/webhooks`.
2. Subscribe to events: **Pull requests**, **Issue comments**.
3. Grant permissions: **Checks** (read & write), **Contents** (read), **Issues** (read & write), **Metadata** (read), **Pull requests** (read & write).
4. Install the app on target organizations/repositories.
5. Set `APP_ID`, `PRIVATE_KEY`, and `WEBHOOK_SECRET` in your environment.

For local development, use a tunnel (e.g. ngrok, Cloudflare Tunnel) to forward webhooks to `localhost:3000`.


## Development

### Prerequisites

- Node.js 20+
- PostgreSQL (for metrics and governance features)
- Redis (optional, for async scan queue)

### Install and run

```bash
npm install
npm run build
npm run migrate    # apply database migrations
npm start          # Probot + Express API on PORT (default 3000)
```

### Additional scripts

| Script | Description |
| --- | --- |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:db` | Test PostgreSQL connection |
| `npm run worker` | Start BullMQ scan worker |
| `npm run scheduled-scan` | Run scheduled repository scan (CI/cron) |
| `npm run health:server` | Run server via ts-node (dev) |

### Async scan worker

When `REDIS_URL` is configured, enqueue repository scans from the API/handler path and process them with:

```bash
npm run build
npm run worker
```


## Security best practices

If Compliance Shield detects a secret:

1. Remove it from the repository immediately.
2. Rotate the exposed credential.
3. Move secrets to secure storage (GitHub Secrets, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, etc.).

Never commit `.env` files or private keys. Review override audit trails regularly in the dashboard.


## Technology stack

| Layer | Technologies |
| --- | --- |
| Runtime | Node.js, TypeScript |
| GitHub integration | Probot, Octokit, GitHub Checks API |
| API | Express 5, CORS |
| Queue | BullMQ, ioredis |
| Database | PostgreSQL (`pg`) |
| AI | OpenAI API |
| Observability | Pino, Sentry |
| Dashboard | React 19, Vite, Recharts |
| Testing | Jest |


## Legal

- [Privacy Policy](PRIVACY.md)
- [Terms of Service](TERMS.md)


## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Ensure `npm test` passes.
4. Submit a pull request.


## License

This project is licensed under the MIT License.


## Support

If you find this project useful, star the repository and help improve developer security across your organization.
