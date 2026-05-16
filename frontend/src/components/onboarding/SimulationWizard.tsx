"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldPath } from "react-hook-form"
import { Loader2, Sparkles } from "lucide-react"

import { completeOnboarding } from "@/actions/onboarding"
import {
  AGE_RANGES,
  DEFAULT_EXOGENOUS,
  PRIMARY_CHANNELS,
  simulationInitDemoPreset,
  simulationWizardSchema,
  type PrimaryChannel,
  type SimulationWizardInput,
} from "@/schemas/simulation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

const STEPS = [
  {
    key: "endogenous" as const,
    title: "Controllable Inputs",
    subtitle: "Monthly ad spend, paid channels, and base pricing.",
  },
  {
    key: "transactional" as const,
    title: "Financial Baselines",
    subtitle: "Average order value and customer acquisition cost.",
  },
  {
    key: "audience" as const,
    title: "Target Demographics",
    subtitle: "Geographic regions and primary age band for clustering.",
  },
  {
    key: "exogenous" as const,
    title: "Market & Competitors",
    subtitle: "Optional — skip to use baseline competitor and macro proxies.",
  },
]

const EMPTY_DEFAULTS: SimulationWizardInput = {
  endogenous: { budget: 0, primary_channels: [], base_price: 0 },
  transactional: { aov: 0, cac: 0 },
  audience: { regions: [], target_age_range: "25-34" },
  exogenous: {
    competitors: [...DEFAULT_EXOGENOUS.competitors],
    macroeconomic_flags: [...DEFAULT_EXOGENOUS.macroeconomic_flags],
  },
}

function parseListInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function NumberField({
  control,
  name,
  label,
  description,
  step,
}: {
  control: ReturnType<typeof useForm<SimulationWizardInput>>["control"]
  name: FieldPath<SimulationWizardInput>
  label: string
  description?: string
  step?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step ?? "any"}
              value={
                typeof field.value === "number" && Number.isFinite(field.value)
                  ? field.value
                  : ""
              }
              onChange={(e) => {
                const next = e.target.valueAsNumber
                field.onChange(Number.isNaN(next) ? 0 : next)
              }}
            />
          </FormControl>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function ListField({
  control,
  name,
  label,
  description,
  placeholder,
}: {
  control: ReturnType<typeof useForm<SimulationWizardInput>>["control"]
  name: "audience.regions" | "exogenous.competitors" | "exogenous.macroeconomic_flags"
  label: string
  description?: string
  placeholder: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <textarea
              data-slot="textarea"
              rows={3}
              placeholder={placeholder}
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              value={(field.value as string[]).join(", ")}
              onChange={(e) => field.onChange(parseListInput(e.target.value))}
            />
          </FormControl>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function SimulationWizard({ locale }: { locale: string }) {
  const { userId, isLoaded } = useAuth()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [skipExogenous, setSkipExogenous] = useState(false)

  const form = useForm<SimulationWizardInput>({
    resolver: zodResolver(simulationWizardSchema),
    defaultValues: EMPTY_DEFAULTS,
    mode: "onTouched",
  })

  const progressValue = ((step + 1) / STEPS.length) * 100
  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  async function handleNext() {
    const valid = await form.trigger(currentStep.key)
    if (valid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function loadDemoPreset() {
    form.reset(simulationInitDemoPreset)
    setSkipExogenous(false)
    setSubmitError(null)
  }

  function applyExogenousDefaults() {
    form.setValue("exogenous", {
      competitors: [...DEFAULT_EXOGENOUS.competitors],
      macroeconomic_flags: [...DEFAULT_EXOGENOUS.macroeconomic_flags],
    })
    setSkipExogenous(true)
    setSubmitError(null)
  }

  async function onSubmit(values: SimulationWizardInput) {
    if (!isLoaded) {
      setSubmitError("Authentication is still loading. Please try again.")
      return
    }
    if (!userId) {
      setSubmitError("You must be signed in to initialize a simulation.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const payload: SimulationWizardInput = skipExogenous
      ? {
          endogenous: values.endogenous,
          transactional: values.transactional,
          audience: values.audience,
        }
      : values

    const result = await completeOnboarding(locale, payload)
    if (!result.success) {
      setSubmitError(result.error)
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Brand Simulation Onboarding</CardTitle>
            <CardDescription>
              Step {step + 1} of {STEPS.length}: {currentStep.title}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadDemoPreset}>
            <Sparkles className="size-4" />
            Load Demo Preset
          </Button>
        </div>
        <Progress value={progressValue} className="mt-4 h-2" />
        <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  control={form.control}
                  name="endogenous.budget"
                  label="Monthly ad spend"
                  description="Total paid media budget per month."
                />
                <NumberField
                  control={form.control}
                  name="endogenous.base_price"
                  label="Base price"
                  step="0.01"
                />
                <FormField
                  control={form.control}
                  name="endogenous.primary_channels"
                  render={() => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Primary channels</FormLabel>
                      <FormDescription>
                        Select all paid platforms you actively run.
                      </FormDescription>
                      <div className="mt-2 flex flex-wrap gap-4">
                        {PRIMARY_CHANNELS.map((channel) => (
                          <ChannelCheckbox
                            key={channel}
                            channel={channel}
                            control={form.control}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  control={form.control}
                  name="transactional.aov"
                  label="Average order value (AOV)"
                  step="0.01"
                />
                <NumberField
                  control={form.control}
                  name="transactional.cac"
                  label="Customer acquisition cost (CAC)"
                  step="0.01"
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <ListField
                  control={form.control}
                  name="audience.regions"
                  label="Target locations"
                  description="Comma- or newline-separated cities or divisions."
                  placeholder="Dhaka, Chittagong, Sylhet"
                />
                <FormField
                  control={form.control}
                  name="audience.target_age_range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary age range</FormLabel>
                      <FormDescription>
                        Structured band used for agent clustering in the graph.
                      </FormDescription>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          {AGE_RANGES.map((range) => (
                            <option key={range} value={range}>
                              {range}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    Skip this step to use baseline competitor and macro proxies.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={applyExogenousDefaults}
                  >
                    Use baseline defaults
                  </Button>
                </div>
                {!skipExogenous ? (
                  <>
                    <ListField
                      control={form.control}
                      name="exogenous.competitors"
                      label="Competitors"
                      description="Named brands in your category."
                      placeholder="Unilever Bangladesh, Square Toiletries"
                    />
                    <ListField
                      control={form.control}
                      name="exogenous.macroeconomic_flags"
                      label="Macroeconomic flags"
                      description="Optional signals (inflation, FX, seasonality)."
                      placeholder="inflation_elevated, ramadan_season"
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Using defaults: {DEFAULT_EXOGENOUS.competitors.join(", ")} ·{" "}
                    {DEFAULT_EXOGENOUS.macroeconomic_flags.join(", ")}
                  </p>
                )}
              </div>
            )}

            {submitError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-between gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
            >
              Back
            </Button>

            <div className="flex gap-2">
              {!isLastStep ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !isLoaded || !userId}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving to graph…
                    </>
                  ) : (
                    "Complete onboarding"
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}

function ChannelCheckbox({
  channel,
  control,
}: {
  channel: PrimaryChannel
  control: ReturnType<typeof useForm<SimulationWizardInput>>["control"]
}) {
  return (
    <FormField
      control={control}
      name="endogenous.primary_channels"
      render={({ field }) => {
        const selected = (field.value as PrimaryChannel[]) ?? []
        const checked = selected.includes(channel)
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`channel-${channel}`}
              checked={checked}
              onCheckedChange={(value) => {
                const next =
                  value === true
                    ? [...selected, channel]
                    : selected.filter((c) => c !== channel)
                field.onChange(next)
              }}
            />
            <Label htmlFor={`channel-${channel}`} className="font-normal">
              {channel}
            </Label>
          </div>
        )
      }}
    />
  )
}
