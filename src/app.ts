import dotenv from "dotenv";
dotenv.config();
import { Probot } from "probot";
import { handlePullRequest } from "./handlers/pullRequestHandler";
import { handleCommentCommand } from "./handlers/commentCommandHandler";
import { initializeSentry, captureException } from "./utils/sentry";
import { logger } from "./utils/logger";

initializeSentry();

export default (app: Probot) => {
  app.log.info("Compliance Shield loaded");
  logger.info({ event: "app.loaded" }, "Compliance Shield loaded");

  app.on(["pull_request.opened", "pull_request.synchronize"], async (context) => {
    logger.info(
      {
        event: context.name,
        action: context.payload.action,
        repo: context.payload.repository.full_name,
        pr: context.payload.pull_request.number
      },
      "Pull request webhook received"
    );
    try {
      await handlePullRequest(context);
    } catch (error) {
      logger.error(
        {
          event: context.name,
          repo: context.payload.repository.full_name,
          pr: context.payload.pull_request.number,
          error
        },
        "Pull request handler failed"
      );

      captureException(error);
      throw error;
    }
  });

  app.on("issue_comment.created", async (context) => {
    logger.info(
      {
        event: context.name,
        action: context.payload.action,
        repo: context.payload.repository.full_name,
        issue: context.payload.issue.number,
        sender: context.payload.sender.login
      },
      "Issue comment webhook received"
    );

    try {
      await handleCommentCommand(context);
    } catch (error) {
      logger.error(
        {
          event: context.name,
          repo: context.payload.repository.full_name,
          issue: context.payload.issue.number,
          sender: context.payload.sender.login,
          error
        },
        "Comment command handler failed"
      );

      captureException(error);
      throw error;
    }
  });
};