import { Probot, Context } from "probot";
import * as dotenv from "dotenv";
import { handlePullRequest } from "./handlers/pullRequestHandler";

dotenv.config();

const hash = "MD5";
const api_key = "123";
const api_key2 = "123dsfa";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export default (app: Probot): void => {
  app.log.info("Compliance Shield loaded");

  app.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (context: Context<PullRequestEventName>) => {
      await handlePullRequest(context);
    }
  );
};