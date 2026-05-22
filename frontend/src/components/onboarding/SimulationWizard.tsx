"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldPath } from "react-hook-form"
import { Loader2, Sparkles, Eye, MousePointer, DollarSign, Target, Brain, Rocket } from "lucide-react"

import { completeOnboarding } from "@/actions/onboarding"
import {
  AGE_RANGES,
  GENDERS,
  INTERESTS,
  simulationInitDemoPreset,
  simulationWizardSchema,
  type SimulationWizardInput,
} from "@/schemas/simulation"
import type { SimulationRequest } from "@/lib/types/contracts"
import { Button } from "@/components/ui/button"
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STEPS = [
  {
    title: "Ad Metrics",
    subtitle: "Historical performance metrics to run simulation.",
  },
  {
    title: "Demographics",
    subtitle: "Target audience constraints.",
  },
]

const EMPTY_DEFAULTS: Partial<SimulationWizardInput> = {
  Impressions: 0,
  Clicks: 0,
  Spent: 0,
  Total_Conversion: 0,
}

function NumberField({
  control,
  name,
  label,
  description,
  step,
  icon: Icon,
  placeholder,
}: {
  control: ReturnType<typeof useForm<SimulationWizardInput>>["control"]
  name: FieldPath<SimulationWizardInput>
  label: string
  description?: string
  step?: string
  icon?: React.ElementType
  placeholder?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {Icon && <Icon className="size-4 text-muted-foreground" />}
            {label}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step ?? "any"}
              placeholder={placeholder}
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

export function SimulationWizard({ locale }: { locale: string }) {
  const { userId, isLoaded } = useAuth()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<SimulationWizardInput>({
    resolver: zodResolver(simulationWizardSchema),
    defaultValues: EMPTY_DEFAULTS as SimulationWizardInput,
    mode: "onTouched",
  })

  const progressValue = ((step + 1) / STEPS.length) * 100
  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  async function handleNext() {
    let fieldsToValidate: FieldPath<SimulationWizardInput>[] = []
    if (step === 0) {
      fieldsToValidate = ["Impressions", "Clicks", "Spent", "Total_Conversion"]
    } else if (step === 1) {
      fieldsToValidate = ["age", "gender", "interest"]
    }
    const valid = await form.trigger(fieldsToValidate)
    if (valid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function loadDemoPreset() {
    form.reset(simulationInitDemoPreset)
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

    const payload: SimulationRequest = {
      clerk_user_id: userId,
      endogenous: {
        Impressions: values.Impressions,
        Clicks: values.Clicks,
        Spent: values.Spent,
      },
      transactional: {
        Total_Conversion: values.Total_Conversion,
      },
      audience: {
        age: values.age,
        gender: values.gender,
        interest: values.interest,
      },
    }

    const result = await completeOnboarding(locale, payload)
    if (!result.success) {
      setSubmitError(result.error)
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl shadow-[0_0_60px_rgba(99,102,241,0.15)] border-white/10 relative overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Brand Simulation Onboarding</CardTitle>
            <CardDescription>
              Step {step + 1} of {STEPS.length}: {currentStep.title}
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={loadDemoPreset} className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg">
            <Sparkles className="size-4 animate-pulse mr-1" />
            Load Demo Preset
          </Button>
        </div>
        <div className="mt-6 mb-2 relative">
          <Progress value={progressValue} className="h-2 bg-muted/50" indicatorClassName="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="flex justify-between mt-2 px-1">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isPast = i < step;
              return (
                <div key={s.title} className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mb-1 ${isActive ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]' : isPast ? 'bg-indigo-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${isActive ? 'text-indigo-400 font-medium' : 'text-muted-foreground'}`}>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-2">{currentStep.subtitle}</p>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  control={form.control}
                  name="Impressions"
                  label="Impressions"
                  description="Number of ad impressions."
                  icon={Eye}
                  placeholder="e.g., 50,000"
                />
                <NumberField
                  control={form.control}
                  name="Clicks"
                  label="Clicks"
                  description="Number of ad clicks."
                  step="1"
                  icon={MousePointer}
                  placeholder="e.g., 2,500"
                />
                <NumberField
                  control={form.control}
                  name="Spent"
                  label="Spent"
                  description="Amount of money spent on the ad."
                  icon={DollarSign}
                  placeholder="e.g., 10,000"
                />
                <NumberField
                  control={form.control}
                  name="Total_Conversion"
                  label="Total Conversion"
                  description="Total number of conversions."
                  step="1"
                  icon={Target}
                  placeholder="e.g., 150"
                />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Range</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an age range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AGE_RANGES.map((range) => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENDERS.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender === "M" ? "Male" : "Female"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interest"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Interest</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an interest" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTERESTS.map((interest) => (
                            <SelectItem key={interest} value={interest}>
                              {interest}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {submitError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-between gap-2 border-t mt-4 pt-4">
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
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-90 transition-opacity"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Running Simulation…
                    </>
                  ) : (
                    <>
                      <Rocket className="size-4 mr-2" />
                      Launch Simulation
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Form>
      {isSubmitting && <LoadingOverlay absolute />}
    </Card>
  )
}
