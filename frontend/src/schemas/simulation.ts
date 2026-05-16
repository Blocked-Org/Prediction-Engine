import { z } from "zod";

export const PRIMARY_CHANNELS = ["Meta", "Google", "TikTok"] as const;
export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;

export const DEFAULT_EXOGENOUS = {
  competitors: ["Category Benchmark A", "Category Benchmark B"],
  macroeconomic_flags: ["baseline_market_conditions"],
} as const;

export const primaryChannelSchema = z.enum(PRIMARY_CHANNELS);
export const ageRangeSchema = z.enum(AGE_RANGES);

export const endogenousSchema = z.object({
  budget: z.number().positive("Monthly ad spend must be greater than zero"),
  primary_channels: z
    .array(primaryChannelSchema)
    .min(1, "Select at least one channel"),
  base_price: z.number().positive("Base price must be greater than zero"),
});

export const transactionalSchema = z.object({
  aov: z.number().positive("AOV must be greater than zero"),
  cac: z.number().nonnegative("CAC cannot be negative"),
});

export const audienceSchema = z.object({
  regions: z
    .array(z.string().min(1, "Region cannot be empty"))
    .min(1, "At least one region is required"),
  target_age_range: ageRangeSchema,
});

export const exogenousSchema = z.object({
  competitors: z.array(z.string().min(1, "Competitor name cannot be empty")),
  macroeconomic_flags: z.array(z.string().min(1, "Flag cannot be empty")),
});

/** Steps 1–3 required; exogenous optional (defaults applied server-side). */
export const simulationWizardSchema = z.object({
  endogenous: endogenousSchema,
  transactional: transactionalSchema,
  audience: audienceSchema,
  exogenous: exogenousSchema.optional(),
});

export const simulationInitSchema = simulationWizardSchema.extend({
  clerk_user_id: z.string().min(1, "Authentication required"),
});

export type PrimaryChannel = z.infer<typeof primaryChannelSchema>;
export type AgeRange = z.infer<typeof ageRangeSchema>;
export type EndogenousInput = z.infer<typeof endogenousSchema>;
export type TransactionalInput = z.infer<typeof transactionalSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;
export type ExogenousInput = z.infer<typeof exogenousSchema>;
export type SimulationWizardInput = z.infer<typeof simulationWizardSchema>;
export type SimulationInitInput = z.infer<typeof simulationInitSchema>;

export const simulationInitDemoPreset: SimulationWizardInput = {
  endogenous: {
    budget: 250_000,
    primary_channels: ["Meta", "Google", "TikTok"],
    base_price: 42.5,
  },
  transactional: {
    aov: 38.75,
    cac: 14.2,
  },
  audience: {
    regions: ["Dhaka", "Chittagong", "Sylhet"],
    target_age_range: "25-34",
  },
  exogenous: {
    competitors: [...DEFAULT_EXOGENOUS.competitors],
    macroeconomic_flags: [...DEFAULT_EXOGENOUS.macroeconomic_flags],
  },
};

export function withExogenousDefaults(
  input: SimulationWizardInput
): SimulationWizardInput & { exogenous: ExogenousInput } {
  const exo = input.exogenous;
  const needsDefaults =
    !exo ||
    (exo.competitors.length === 0 && exo.macroeconomic_flags.length === 0);

  return {
    ...input,
    exogenous: needsDefaults
      ? {
          competitors: [...DEFAULT_EXOGENOUS.competitors],
          macroeconomic_flags: [...DEFAULT_EXOGENOUS.macroeconomic_flags],
        }
      : {
          competitors:
            exo.competitors.length > 0
              ? exo.competitors
              : [...DEFAULT_EXOGENOUS.competitors],
          macroeconomic_flags:
            exo.macroeconomic_flags.length > 0
              ? exo.macroeconomic_flags
              : [...DEFAULT_EXOGENOUS.macroeconomic_flags],
        },
  };
}
