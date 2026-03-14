import { Context } from "probot";

const BOT_MARKER = "<!-- compliance-shield -->";

export async function upsertBotComment(
  context: Context,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
) {
  const comments = await context.octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  });

  const existing = comments.data.find((c) =>
    c.body?.includes(BOT_MARKER)
  );

  const finalBody = `${BOT_MARKER}\n${body}`;

  if (existing) {
    await context.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: finalBody
    });
  } else {
    await context.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: finalBody
    });
  }
}