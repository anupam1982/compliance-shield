import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const scanQueue = new Queue("compliance-scans", {
  connection: redisConnection
});