import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import { AiCommandJob } from "../types/queue";

export const aiCommandQueue = new Queue<AiCommandJob>(
  "compliance-ai-commands",
  {
    connection: redisConnection
  }
);