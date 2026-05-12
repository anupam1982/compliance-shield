// import { Probot, Context } from "probot";
// import * as dotenv from "dotenv";
// import { handlePullRequest } from "./handlers/pullRequestHandler";
// import { handleCommentCommand } from "./handlers/commentCommandHandler";

// dotenv.config();

// type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";
// type IssueCommentEventName = "issue_comment.created";

// export default (app: Probot): void => {
//   app.log.info("Compliance Shield loaded");

//   app.onAny(async (context) => {
//     app.log.info(`Received event: ${context.name}`);
//   });

//   app.on(
//     ["pull_request.opened", "pull_request.synchronize"],
//     async (context: Context<PullRequestEventName>) => {
//       app.log.info("Pull request event matched handler");
//       await handlePullRequest(context);
//     }
//   );

//   app.on("issue_comment.created", async (context: Context<IssueCommentEventName>) => {
//     app.log.info("Issue comment event matched handler");
//     await handleCommentCommand(context);
//   });
// };

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