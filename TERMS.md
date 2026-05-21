# Terms of Service

**Last updated:** May 2026

These Terms of Service (“Terms”) govern your use of **Compliance Shield**, an open-source GitHub App for automated security and compliance scanning. By installing, configuring, or using Compliance Shield, you agree to these Terms.

Compliance Shield is typically **self-hosted**: the person or organization that deploys the application (“Operator”) runs the servers, stores configuration secrets, and chooses which optional services (database, Redis, OpenAI, Sentry) to enable. Developers whose repositories are scanned (“Users”) are subject to both these Terms and their employer’s internal policies.

If you do not agree to these Terms, do not install or use Compliance Shield.


## Description of the service

Compliance Shield provides:

- Automated scanning of pull requests and repositories
- Detection of secrets, insecure patterns, and configurable policy violations
- GitHub Check Runs and pull request comments
- Optional merge-blocking based on severity thresholds
- Governance workflows including documented overrides and audit trails
- Optional AI-assisted explanations and remediation suggestions
- Optional analytics dashboards and usage metering

The software is provided as source code under the [MIT License](LICENSE). Operators may modify, fork, and deploy their own instances.


## Eligibility and installation

You must have authority to install GitHub Apps on the target organization or repository. Installation grants Compliance Shield the GitHub permissions required to read repository content, post comments, and create or update check runs, as configured in your GitHub App settings.

You are responsible for:

- Accurate GitHub App configuration and webhook delivery
- Securing environment variables and private keys
- Defining repository policies in `.compliance-shield.yml` and related config files
- Deciding whether optional AI, metrics, and third-party integrations are appropriate for your data


## Acceptable use

You agree to use Compliance Shield only for lawful purposes related to software security and compliance. You must not:

- Use the service to access repositories or data you are not authorized to view
- Circumvent scan results or override controls for the purpose of concealing known security incidents from auditors without proper authorization
- Reverse engineer or abuse GitHub API rate limits or Compliance Shield infrastructure
- Misrepresent automated scan output as a formal compliance certification or audit sign-off
- Upload or process malicious content intended to compromise the Operator’s deployment

Operators may suspend or uninstall the app at any time.


## No professional advice

Compliance Shield produces **automated technical findings and suggestions**. Output does not constitute legal, regulatory, financial, or professional security advice. Policy packs (for example SOC 2, GDPR, PCI DSS, HIPAA, OWASP) are **helpers aligned with common control themes**—they do not, by themselves, demonstrate compliance with any standard or law.

You remain solely responsible for:

- Interpreting scan results in your organizational context
- Remediating identified risks
- Meeting contractual, regulatory, and internal security obligations
- Deciding whether a pull request may merge


## AI features

When enabled, AI features send structured violation context to third-party model providers (for example OpenAI) as described in the [Privacy Policy](PRIVACY.md). AI-generated text may be incomplete, inaccurate, or unsuitable for your environment.

**You must review all AI suggestions before acting on them.** Do not rely on AI output as the sole basis for security decisions or compliance conclusions.


## Governance overrides

Compliance Shield may allow authorized users to record **time-bound compliance overrides** with reasons captured in an audit trail. Overrides are an operational workflow convenience—they do not:

- Eliminate underlying security risk
- Waive legal or contractual obligations
- Replace formal risk acceptance processes required by your organization

Operators configure who may approve overrides and whether reasons are required.


## Disclaimers

**Compliance Shield is provided “as is” and “as available,” without warranties of any kind**, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or accuracy.

We do not warrant that:

- Scans will detect every vulnerability, secret, or compliance gap
- The service will be uninterrupted, error-free, or free of false positives or false negatives
- Check runs, comments, or dashboards will always reflect the latest repository state
- Optional AI responses will be correct, complete, or safe to apply
- Use of the software will satisfy any specific regulatory framework

**Use at your own risk.**


## Limitation of liability

To the maximum extent permitted by applicable law, the project authors, contributors, and Operators of upstream deployments **shall not be liable** for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, goodwill, or business interruption, arising from or related to:

- Installation or use of Compliance Shield
- Reliance on scan results, dashboards, overrides, or AI output
- Failure to detect a security issue or compliance violation
- Unauthorized access to Operator infrastructure misconfigured by the Operator
- Actions taken or not taken based on GitHub Check Run or merge-blocking status

In jurisdictions that do not allow certain limitations, liability is limited to the greatest extent permitted by law.

**Operators** who run production instances assume operational liability for their own deployments, data stores, and integrations. The open-source maintainers are not responsible for how third parties host or configure the software.


## Indemnification

If you are an Operator, you agree to indemnify and hold harmless the project maintainers and contributors from claims, damages, and expenses (including reasonable legal fees) arising from your deployment, configuration, or use of Compliance Shield—except to the extent caused by the maintainers’ intentional misconduct, where prohibited by law.


## Third-party services

Compliance Shield integrates with services you configure, including **GitHub**, and optionally **OpenAI**, **PostgreSQL**, **Redis**, and **Sentry**. Those services are governed by their own terms and policies. The Compliance Shield project is not responsible for third-party outages, pricing, data handling, or API changes.

See the [Privacy Policy](PRIVACY.md) for data processing details.


## Open source license

Compliance Shield source code is distributed under the **MIT License**. You may copy, modify, merge, publish, distribute, sublicense, and sell copies of the software subject to the license conditions, including preservation of copyright and permission notices.

These Terms supplement—but do not replace—the MIT License for the software itself.


## Modifications to the service and Terms

The open-source project may change features, documentation, or these Terms over time. Material updates will be reflected in this repository with a revised “Last updated” date.

For self-hosted deployments, Operators are responsible for upgrading instances, reviewing release notes, and communicating changes to their Users. Continued use after Terms are updated constitutes acceptance of the revised Terms, unless applicable law requires otherwise.


## Termination

You may stop using Compliance Shield at any time by uninstalling the GitHub App and disabling Operator infrastructure.

Uninstalling the app stops new scans but may not automatically delete historical metrics, violation records, in-repository JSON state files, or logs previously written. Operators should follow their own data retention and cleanup procedures.


## Governing law

These Terms are intended as a general framework for an open-source project. If a dispute arises, it will be handled according to the laws applicable in the jurisdiction of the party bringing the claim, unless mandatory consumer protection laws in your country require otherwise.

For enterprise deployments, Operators may impose additional contractual terms on their internal users.


## Contact

For questions about these Terms, open an issue or discussion on the [Compliance Shield GitHub repository](https://github.com/anupam1982/compliance-shield).

For production systems operated by your employer, contact your platform or security team.


## Related documents

- [Privacy Policy](PRIVACY.md)
- [README](README.md) — product overview, configuration, and operations
