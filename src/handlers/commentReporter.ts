import { Context } from "probot";
import { COMPLIANCE_SHIELD_COMMENT_MARKER } from "../constants";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function upsertPullRequestComment(
  context: Context<PullRequestEventName>,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const fullBody = `${COMPLIANCE_SHIELD_COMMENT_MARKER}\n${body}`;

  const commentsResponse = await context.octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100
  });

  const existingComment = commentsResponse.data.find((comment) =>
    comment.body?.includes(COMPLIANCE_SHIELD_COMMENT_MARKER)
  );

  if (existingComment) {
    await context.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: fullBody
    });

    context.log.info(`Updated existing Compliance Shield comment: ${existingComment.id}`);
    return;
  }

  const createdComment = await context.octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: fullBody
  });

  context.log.info(`Created new Compliance Shield comment: ${createdComment.data.id}`);
}