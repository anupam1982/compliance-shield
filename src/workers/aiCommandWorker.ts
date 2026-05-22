import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis";
import { AiCommandJob } from "../types/queue";
import { createWorkerOctokit } from "./githubWorkerClient";
import { loadComplianceConfig } from "../github/configLoader";
import { runRepositoryScan } from "../handlers/scanService";
import { generateAIReview } from "../services/aiReviewerService";
import { generateGovernanceResponse } from "../services/governanceCopilotService";
import { generateAutofixSuggestions } from "../services/aiAutofixService";

const worker = new Worker<AiCommandJob>(
  "compliance-ai-commands",
  async (job) => {
    const {
      owner,
      repo,
      prNumber,
      installationId,
      command
    } = job.data;

    const octokit = await createWorkerOctokit(installationId);

    const repoResponse = await octokit.repos.get({
      owner,
      repo
    });

    const repoInfo = {
      owner,
      repo,
      defaultBranch: repoResponse.data.default_branch
    };

    const fakeContext: any = {
      octokit,
      log: console,
      payload: {
        repository: repoResponse.data
      }
    };

    const config = await loadComplianceConfig(fakeContext, repoInfo);

    const result = await runRepositoryScan(fakeContext, repoInfo, config);

    if (command === "explain") {
      const review = await generateAIReview(result.violations);

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `
## 🤖 AI Security Review

**Repository:** ${owner}/${repo}  
**Risk Level:** ${review.riskLevel}  
**Findings analyzed:** ${result.violations.length}

${review.summary}
`
      });

      return;
    }

    if (command === "autofix") {
      const suggestions = await generateAutofixSuggestions(result.violations);

      const formattedSuggestions = suggestions
        .map(
          (s) => `
### ${s.fileName}

**Severity:** ${s.severity}

**Problem:** ${s.problem}

${s.suggestion}
`
        )
        .join("\n---\n");

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `
# 🤖 AI AutoFix Suggestions

${formattedSuggestions}
`
      });

      return;
    }

    let question = "";

    switch (command) {
      case "why-blocked":
        question = "Why should this pull request be blocked?";
        break;
      case "explain-risk":
        question = "Explain the repository risk posture.";
        break;
      case "top-risk":
        question = "What are the highest risk issues?";
        break;
    }

    const response = await generateGovernanceResponse(
      question,
      result.violations
    );

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `
## 🤖 Governance Copilot

${response}
`
    });
  },
  {
    connection: redisConnection,
    lockDuration: 120000,
    concurrency: 1
  }
);

worker.on("completed", (job) => {
  console.log(`AI command job completed ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error("AI command job failed", {
    jobId: job?.id,
    data: job?.data,
    error: err.message
  });
});