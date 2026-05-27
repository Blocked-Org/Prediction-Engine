import { z } from "zod";

export const AGE_RANGES = ["18-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50+"] as const;
export const GENDERS = ["M", "F"] as const;
export const INTERESTS = ["Travel", "Sports", "Tech", "Fashion", "Food"] as const;

export const simulationWizardSchema = z.object({
  Impressions: z.number().nonnegative(),
  Clicks: z.number().int().nonnegative(),
  spend_meta: z.number().nonnegative(),
  spend_google: z.number().nonnegative(),
  spend_tiktok: z.number().nonnegative(),
  Total_Conversion: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  age: z.enum(AGE_RANGES),
  gender: z.enum(GENDERS),
  interest: z.enum(INTERESTS),
  competitor_urls: z
    .string()
    .describe("Comma-separated competitor URLs for Firecrawl scraping."),
});

export const simulationInitSchema = simulationWizardSchema.extend({
  clerk_user_id: z.string().min(1, "Authentication required"),
});

export type AgeRange = typeof AGE_RANGES[number];
export type Gender = typeof GENDERS[number];
export type Interest = typeof INTERESTS[number];
export type SimulationWizardInput = z.infer<typeof simulationWizardSchema>;
export type SimulationInitInput = z.infer<typeof simulationInitSchema>;

export const simulationInitDemoPreset: SimulationWizardInput = {
  Impressions: 100000,
  Clicks: 5000,
  spend_meta: 75000,
  spend_google: 50000,
  spend_tiktok: 25000,
  Total_Conversion: 250,
  revenue: 500000,
  age: "25-29",
  gender: "M",
  interest: "Travel",
  competitor_urls: "https://www.daraz.com.bd, https://www.chaldal.com",
};
