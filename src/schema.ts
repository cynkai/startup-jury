import { z } from 'zod';

export const startupIdeaSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(10),
  targetCustomer: z.string().optional(),
  customerSegment: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  uniqueValue: z.string().optional(),
  revenueModel: z.string().optional(),
  pricingHint: z.string().optional(),
  acquisitionChannel: z.string().optional(),
  marketRegion: z.string().optional(),
  whyNow: z.string().optional(),
  teamStrength: z.string().optional(),
  mvpScope: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  stage: z.enum(['idea', 'prototype', 'mvp', 'launched']).optional(),
});

export type StartupIdeaSchema = z.infer<typeof startupIdeaSchema>;
