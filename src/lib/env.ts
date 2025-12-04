import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "Missing Supabase key"),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1, "Missing Supabase project ID"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const env = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  };

  const result = envSchema.safeParse(env);

  if (!result.success) {
    console.error("Environment validation failed:", result.error.flatten());
    throw new Error("Invalid environment configuration");
  }

  return result.data;
}

export const env = validateEnv();
