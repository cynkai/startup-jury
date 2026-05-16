import { z } from 'zod';

export const startupIdeaSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(10),
  targetCustomer: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  revenueModel: z.string().optional(),
  marketRegion: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  stage: z.enum(['idea', 'prototype', 'mvp', 'launched']).optional(),
});

export type StartupIdeaSchema = z.infer<typeof startupIdeaSchema>;
