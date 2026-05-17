import { z } from "zod";

export const AGE_RANGES = ["18-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50+"] as const;
export const GENDERS = ["M", "F"] as const;
export const INTERESTS = ["Travel", "Sports", "Tech", "Fashion", "Food"] as const;

export const simulationWizardSchema = z.object({
  Impressions: z.number().nonnegative(),
  Clicks: z.number().int().nonnegative(),
  Spent: z.number().nonnegative(),
  Total_Conversion: z.number().int().nonnegative(),
  age: z.enum(AGE_RANGES),
  gender: z.enum(GENDERS),
  interest: z.enum(INTERESTS),
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
  Spent: 1500,
  Total_Conversion: 250,
  age: "25-29",
  gender: "M",
  interest: "Travel",
};
