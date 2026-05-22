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
        <FormItem className="flex flex-col gap-1">
          <FormLabel className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            {Icon && <Icon className="size-4 text-zinc-500" />}
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
              className="bg-black/40 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-primary/45 rounded-xl h-11 transition-all"
            />
          </FormControl>
          {description ? (
            <FormDescription className="text-[11px] text-zinc-500 leading-tight">{description}</FormDescription>
          ) : null}
          <FormMessage className="text-xs text-destructive font-semibold" />
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
    <Card className="w-full bg-zinc-900/60 border-zinc-800/80 backdrop-blur-md rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.15)] text-white relative overflow-hidden">
      
      <CardHeader className="border-b border-zinc-800/60 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-extrabold text-white">Brand Simulation Onboarding</CardTitle>
            <CardDescription className="text-zinc-400">
              Step {step + 1} of {STEPS.length}: {currentStep.title}
            </CardDescription>
          </div>
          <Button 
            type="button" 
            size="sm" 
            onClick={loadDemoPreset} 
            className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-orange-500/10 border-0 h-10 px-5 flex items-center justify-center gap-1.5 self-start sm:self-center"
          >
            <Sparkles className="size-4 animate-pulse" />
            <span>Load Demo Preset</span>
          </Button>
        </div>

        {/* Progress Tracker */}
        <div className="mt-8 relative">
          <Progress 
            value={progressValue} 
            className="h-2 bg-zinc-950 border border-zinc-850 rounded-full" 
            indicatorClassName="bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500" 
          />
          <div className="flex justify-between mt-3 px-1">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isPast = i < step;
              return (
                <div key={s.title} className="flex flex-col items-center gap-1">
                  <div className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                    isActive 
                      ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse' 
                      : isPast 
                        ? 'bg-primary border-primary' 
                        : 'bg-zinc-800 border-zinc-850'
                  }`} />
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`}>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-sm text-zinc-400 text-center mt-4 italic font-medium">"{currentStep.subtitle}"</p>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6 pb-6">
            
            {step === 0 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <NumberField
                  control={form.control}
                  name="Impressions"
                  label="Impressions"
                  description="Total historical ad impressions served."
                  icon={Eye}
                  placeholder="e.g., 50000"
                />
                <NumberField
                  control={form.control}
                  name="Clicks"
                  label="Clicks"
                  description="Total historical click interactions logged."
                  step="1"
                  icon={MousePointer}
                  placeholder="e.g., 2500"
                />
                <NumberField
                  control={form.control}
                  name="Spent"
                  label="Spent"
                  description="Historical media spend budget (USD)."
                  icon={DollarSign}
                  placeholder="e.g., 10000"
                />
                <NumberField
                  control={form.control}
                  name="Total_Conversion"
                  label="Total Conversion"
                  description="Historical conversion counts logged."
                  step="1"
                  icon={Target}
                  placeholder="e.g., 150"
                />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* Age Field */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Age Range</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-black/40 border-zinc-800/80 text-white rounded-xl h-11 focus:ring-primary/45 transition-all">
                            <SelectValue placeholder="Select target age group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-zinc-850 text-white rounded-xl">
                          {AGE_RANGES.map((range) => (
                            <SelectItem key={range} value={range} className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-lg">
                              {range}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-destructive font-semibold" />
                    </FormItem>
                  )}
                />

                {/* Gender Field */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-black/40 border-zinc-800/80 text-white rounded-xl h-11 focus:ring-primary/45 transition-all">
                            <SelectValue placeholder="Select target gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-zinc-850 text-white rounded-xl">
                          {GENDERS.map((gender) => (
                            <SelectItem key={gender} value={gender} className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-lg">
                              {gender === "M" ? "Male" : "Female"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-destructive font-semibold" />
                    </FormItem>
                  )}
                />

                {/* Interest Field */}
                <FormField
                  control={form.control}
                  name="interest"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 flex flex-col gap-1">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Core Interest / Behavioral Segment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-black/40 border-zinc-800/80 text-white rounded-xl h-11 focus:ring-primary/45 transition-all">
                            <SelectValue placeholder="Select audience interest vertical" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-zinc-850 text-white rounded-xl max-h-[220px] overflow-y-auto">
                          {INTERESTS.map((interest) => (
                            <SelectItem key={interest} value={interest} className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-lg">
                              {interest}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-destructive font-semibold" />
                    </FormItem>
                  )}
                />

              </div>
            )}

            {submitError ? (
              <p className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold animate-shake">
                {submitError}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-between gap-3 border-t border-zinc-850/80 pt-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
              className="rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all px-5 h-11"
            >
              Back
            </Button>

            <div className="flex gap-2">
              {!isLastStep ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="rounded-xl bg-white text-black hover:bg-zinc-200 transition-all font-bold px-6 h-11"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !isLoaded || !userId}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:opacity-90 transition-opacity text-white font-bold shadow-xl shadow-indigo-500/20 px-6 h-11"
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
