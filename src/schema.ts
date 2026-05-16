import { z } from 'zod';

export const startupIdeaSchema = z.object({
  title: z.string().min(2).max(80),
  pitch: z.string().min(10).max(1200),
  notes: z.string().max(800).optional(),
});

export type StartupIdeaSchema = z.infer<typeof startupIdeaSchema>;
