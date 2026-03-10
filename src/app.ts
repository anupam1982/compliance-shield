import { Probot } from "probot";
import * as dotenv from "dotenv";
import { handlePullRequest } from "./handlers/pullRequestHandler";

dotenv.config();

export default (app: Probot) => {

  app.log.info("Compliance Shield loaded");

  app.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (context) => {

      await handlePullRequest(context);

    }
  );

};