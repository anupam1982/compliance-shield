🛡️ Compliance Shield

Compliance Shield is a GitHub App that automatically scans pull requests and repositories for security, compliance, and policy violations before code is merged.

It detects:

- Hardcoded secrets

- Exposed credentials

- Weak cryptography

- Sensitive files

- Custom compliance policy violations

The app comments on pull requests, generates GitHub Check Runs, and can block merges if violations are detected.

Compliance Shield helps teams keep their repositories secure, compliant, and audit-ready.

🚀 Features
Pull Request Scanning

Automatically scans files changed in pull requests.

Example checks include:

- Hardcoded passwords

- API keys

- AWS credentials

- Private keys

- Weak cryptographic algorithms

- Sensitive configuration files

If violations are detected, the bot will comment on the PR with detailed information.

Repository Scanning

Compliance Shield can scan the entire repository.

Trigger a repository scan by adding the following to the PR title:

[scan-repo]

or by running the command:

/compliance-shield scan-repo

Secret Detection

Detects common secrets including:

- GitHub tokens

- AWS access keys

- JWT tokens

- API keys

- Private keys

Policy Packs

Compliance Shield supports multiple built-in policy sets:

| Policy Pack      | Description              |
| ---------------- | ------------------------ |
| **baseline**     | Standard security checks |
| **strict**       | Strong enterprise policy |
| **secrets-only** | Only detect secrets      |
| **crypto**       | Detect weak cryptography |

Autofix Suggestions

When a violation is detected, Compliance Shield provides actionable suggestions.

HIGH SECRET detected

Suggested fix:
Rotate the exposed credential and move it to secure storage such as GitHub Secrets or a secret manager.

Slash Commands

Developers can interact with the bot using PR comments.

Supported commands:

/compliance-shield help
/compliance-shield status
/compliance-shield history
/compliance-shield scan-repo
/compliance-shield rescan


/compliance-shield help
Shows available commands.

/compliance-shield status
Displays the latest scan information.

Example:
Last scan: PR
Violations found: 1
Files scanned: 12

/compliance-shield history
Shows recent scan history.

/compliance-shield scan-repo
Triggers a full repository scan.

/compliance-shield rescan
Re-runs compliance checks on the pull request.

⚙️ Configuration
Add a configuration file in your repository:
.github/compliance-shield.yml

Example configuration:

</YAML> 
scanMode: pr

minimumSeverityToFail: high

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

📊 Example Pull Request Report

Compliance Shield posts a comment on the PR:

🛡️ Compliance Shield

PR: #42
Files scanned: 8
Violations found: 1

HIGH SECRET
AWS Access Key detected

Suggested fix:
Rotate the credential and store it in a secret manager.

🏗 Architecture
Compliance Shield uses a modular architecture built on Probot.

GitHub Webhooks
      │
      ▼
Probot App
      │
      ▼
Pull Request Handler
      │
      ▼
Scan Engine
      │
      ▼
Rule Engine
      │
      ▼
Violation Reporter
      │
      ▼
PR Comment + GitHub Check Run

Key components:

* Pull Request Handler

* Rule Engine

* Scan Engine

* Policy Loader

* Storage Layer

* Comment Reporter

🧪 Development

Install dependencies:
npm install

Build the project:
npm run build

Run locally:
npm start

Run tests:
npm test

🔐 Security Best Practices

If Compliance Shield detects a secret:

* Remove it immediately from the repository

* Rotate the credential

* Move the secret to a secure storage system

Recommended options:

* GitHub Secrets

* HashiCorp Vault

* AWS Secrets Manager

* Azure Key Vault



📦 Technology Stack

Compliance Shield is built using:

* TypeScript

* Probot

* GitHub Checks API

* Jest

🤝 Contributing

Contributions are welcome.

Steps:

*Fork the repository

*Create a feature branch

*Submit a pull request

Please ensure tests pass before submitting changes.

📜 License

This project is licensed under the MIT License.

⭐ Support

If you find this project useful:

⭐ Star the repository
🔐 Help improve developer security