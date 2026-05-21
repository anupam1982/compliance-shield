# Privacy Policy

**Last updated:** May 2026

Compliance Shield is an open-source GitHub App that scans repositories and pull requests for security and compliance violations. This policy describes what information the application processes, where it is stored, and which third-party services may receive data when you install and operate it.

Compliance Shield is typically **self-hosted**: the organization or individual that deploys the app controls the servers, databases, and environment variables. That operator is responsible for securing infrastructure and complying with applicable privacy laws. End users (developers whose repositories are scanned) should also review their organization’s internal policies.


## Information we process

### Repository content (transient)

To perform scans, Compliance Shield reads file contents from GitHub via the GitHub API. Content is processed **in memory** to detect:

- Exposed secrets and credentials
- Insecure or weak patterns (for example weak cryptography)
- Policy violations defined in your configuration

**Full source files are not intentionally persisted** to Compliance Shield’s database. However, scan results may include **file paths, line numbers, violation indicators, and descriptive messages** derived from matched content. In rare cases, a matched string or pattern description could reflect a fragment of sensitive data. Treat persisted violation records as security-sensitive metadata.

### GitHub metadata

The app processes standard GitHub webhook and API data, including:

- Organization and repository names
- Pull request numbers and titles
- GitHub usernames (for example comment authors and override approvers)
- Installation IDs
- Check run and comment identifiers
- Branch and commit references needed to fetch changed files

### Scan and governance records (optional)

When `METRICS_ENABLED=true` and a `DATABASE_URL` is configured, Compliance Shield may store operational data in PostgreSQL, including:

| Data category | Examples |
| --- | --- |
| **Scan metrics** | Owner, repo, scan type, PR number, scan mode, violation counts, severity counts, risk score, duration, triggering user |
| **Violation details** | File name, line number, severity, indicator, message, suggested fix |
| **Override audits** | Approver, reason, risk score, expiry, PR number, status |
| **Usage events** | Event type (for example `autofix_requested`, `override_created`), quantity, optional JSON metadata |

These records support dashboards, analytics, governance reporting, and usage metering. They do **not** include complete repository snapshots.

### In-repository metadata

Compliance Shield may write JSON files inside your GitHub repository (on the default branch), such as:

- `.github/compliance-shield-state.json` — latest scan state
- `.github/compliance-shield-history.json` — rolling history of recent scans (capped)

These files contain **scan metadata only** (timestamps, counts, modes, triggers)—not full file contents.

### Queue data (optional)

When `REDIS_URL` is configured, BullMQ stores short-lived job payloads (repository owner/name, PR number, installation ID, trigger user) until async scans complete.

### Logs and error reporting (optional)

- **Application logs** (Pino) may include repository names, event types, and error details according to your `LOG_LEVEL`.
- **Sentry** (if `SENTRY_DSN` is set) may receive exception stack traces and diagnostic context. Configure sampling via `SENTRY_TRACES_SAMPLE_RATE`.



## How we use information

Information is used solely to:

1. Run compliance and security scans on pull requests and repositories
2. Post PR comments and GitHub Check Runs
3. Enforce configurable merge-blocking severity thresholds
4. Record governance overrides and audit trails
5. Power optional AI-assisted explanations and remediation guidance
6. Provide organization dashboards and analytics
7. Meter product usage for operations and billing insights
8. Maintain reliability through logging and error monitoring

We do not sell personal data or use repository data for advertising.



## Third-party services

Depending on how you configure Compliance Shield, data may be transmitted to:

| Service | When used | Data shared |
| --- | --- | --- |
| **GitHub** | Always (required) | API requests for file content, metadata, comments, and checks; webhook delivery |
| **OpenAI** | When `AI_ENABLED=true` and `OPENAI_API_KEY` is set | Violation summaries (severity, file name, message), prompts for autofix/explain/governance commands—not full repositories by default |
| **PostgreSQL host** | When `METRICS_ENABLED=true` | Scan metrics, violations metadata, overrides, usage events (operator-chosen provider, e.g. Neon) |
| **Redis host** | When `REDIS_URL` is set | Temporary async scan job payloads |
| **Sentry** | When `SENTRY_DSN` is set | Errors and performance traces |

Review each provider’s privacy policy and data processing terms. **If you do not configure OpenAI, Sentry, PostgreSQL, or Redis, those services will not receive data.**



## AI features

Optional AI capabilities (`/compliance-shield explain`, `autofix`, governance copilot commands, and dashboard executive summaries) send **structured violation context** to OpenAI’s API. Operators should:

- Enable AI only when acceptable under your data classification and vendor review process
- Avoid enabling AI on repositories with highly restricted source code unless approved
- Use organization-level controls to restrict which repositories install the app

Compliance Shield does not train custom models on your repository data; prompts are sent to the configured OpenAI model at request time.



## Data retention

Retention depends on operator configuration:

- **PostgreSQL records** persist until deleted by the operator or governed by your database retention policy.
- **Override audits** may include expiry dates; expired overrides can be marked inactive via scheduled maintenance.
- **In-repo history** retains up to 20 recent scan entries.
- **Redis queue jobs** are transient and removed after processing.
- **Logs and Sentry events** follow your logging platform’s retention settings.

Uninstalling the GitHub App stops new scans but does not automatically delete historical database rows or in-repository JSON files. Operators should run their own cleanup procedures.



## Security

Operators should:

- Store `PRIVATE_KEY`, `WEBHOOK_SECRET`, `DATABASE_URL`, and API keys only in secure secret managers or environment variables
- Restrict dashboard and metrics API access (`CORS_ORIGIN`, network policies)
- Use TLS for database and Redis connections in production
- Rotate credentials if a secret is exposed during a scan

If Compliance Shield detects a live secret in your repository, **rotate that credential immediately** regardless of where metadata was stored.



## Your choices

| Control | Effect |
| --- | --- |
| Do not install the GitHub App | No scanning or data collection |
| Set `METRICS_ENABLED=false` or omit `DATABASE_URL` | Disables PostgreSQL persistence |
| Omit `OPENAI_API_KEY` or set `AI_ENABLED=false` | Disables AI features and OpenAI transmission |
| Omit `SENTRY_DSN` | Disables Sentry error reporting |
| Omit `REDIS_URL` | Disables async queue; scans run synchronously |
| Configure `ignorePaths` and inline `compliance-shield-ignore` | Reduces files evaluated |
| Remove in-repo state/history files | Deletes repository-stored scan metadata |

Repository administrators control GitHub App installation, configuration YAML, and override approver lists.



## International users

Compliance Shield does not by itself determine legal basis for processing. Organizations subject to GDPR, HIPAA, PCI DSS, or similar frameworks remain responsible for lawful use, data processing agreements with subprocessors (GitHub, OpenAI, database hosts), and data subject rights requests.



## Children’s privacy

Compliance Shield is intended for professional software development use and is not directed at children under 13 (or the applicable age in your jurisdiction).



## Changes to this policy

We may update this policy as features evolve. Material changes will be reflected in the repository; the “Last updated” date will be revised accordingly. Continued use after changes constitutes acceptance of the updated policy for self-hosted deployments.



## Contact

For privacy questions, security disclosures, or data handling requests related to this open-source project, open an issue or discussion on the [Compliance Shield GitHub repository](https://github.com/anupam1982/compliance-shield).

For deployments operated by your employer, contact your internal security or platform team—the repository maintainer does not control your organization’s production instance.
