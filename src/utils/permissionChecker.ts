import { Context } from "probot";
import { CommandPermissionLevel } from "../types/rules";
import { RepositoryContextInfo } from "../types/githubContext";

type IssueCommentEventName = "issue_comment.created";

export async function hasCommandPermission(
  context: Context<IssueCommentEventName>,
  repoInfo: RepositoryContextInfo,
  requiredLevel: CommandPermissionLevel
): Promise<boolean> {
  if (requiredLevel === "everyone") {
    return true;
  }

  const username = context.payload.comment.user.login;

  try {
    const response = await context.octokit.repos.getCollaboratorPermissionLevel({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      username
    });

    const permission = response.data.permission;

    if (requiredLevel === "write") {
      return ["write", "admin", "maintain"].includes(permission);
    }

    if (requiredLevel === "admin") {
      return permission === "admin";
    }

    return false;
  } catch (error) {
    context.log.error("Failed to check collaborator permission");
    context.log.error(error);
    return false;
  }
}