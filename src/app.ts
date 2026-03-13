import { Probot, Context } from "probot";
import * as dotenv from "dotenv";
import { handlePullRequest } from "./handlers/pullRequestHandler";

dotenv.config();

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export default (app: Probot): void => {
  app.log.info("Compliance Shield loaded");
  app.onAny(async (context) => {
    app.log.info(`Received event: ${context.name}`);
  });

  app.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (context: Context<PullRequestEventName>) => {
      app.log.info("Pull request event matched handler");
      await handlePullRequest(context);
    }
  );
};