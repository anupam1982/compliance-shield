import OpenAI from "openai";
import { AIProvider, AIRemediationRequest } from "./aiProvider";
import { buildRemediationPrompt } from "./promptBuilder";
import { logger } from "../utils/logger";

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateRemediation(input: AIRemediationRequest): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return "AI guidance unavailable: OPENAI_API_KEY is not configured.";
    }

    try {
      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a concise DevSecOps assistant. Do not invent facts. Give practical remediation guidance."
          },
          {
            role: "user",
            content: buildRemediationPrompt(input)
          }
        ]
      });

      return (
        response.choices[0]?.message?.content?.trim() ||
        "AI guidance unavailable."
      );
    } catch (error) {
      logger.error({ event: "ai.openai.failed", error }, "OpenAI remediation failed");
      return "AI guidance unavailable. Please follow the standard remediation guidance.";
    }
  }
}