import { z } from "zod";

export const ComplianceShieldConfigSchema = z.object({
  blockedExtensions: z.array(z.string().min(1)).default([]),

  bannedContentPatterns: z.array(z.string().min(1)).default([]),

  secretDetection: z
    .object({
      enabled: z.boolean().default(true),
      entropyThreshold: z.number().min(0).max(8).optional(),
      minSecretLength: z.number().int().min(1).optional(),
    })
    .default({ enabled: true }),

  rules: z
    .object({
      maxFileSizeKb: z.number().int().min(1).optional(),
      ignorePaths: z.array(z.string()).default([]),
    })
    .default({ ignorePaths: [] }),

  comments: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),

  checks: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),
});

export type ComplianceShieldConfig = z.infer<typeof ComplianceShieldConfigSchema>;