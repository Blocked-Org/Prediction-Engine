"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldPath } from "react-hook-form"
import { Loader2, Sparkles, Eye, MousePointer, Target, Brain, Rocket, Users, ChevronLeft, ChevronRight, Globe, Link } from "lucide-react"

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
    icon: Target,
  },
  {
    title: "Demographics",
    subtitle: "Target audience constraints.",
    icon: Users,
  },
  {
    title: "Market Intel",
    subtitle: "Competitor intelligence & exogenous signals.",
    icon: Globe,
  },
]

const TakaIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold ${className}`} style={{ fontSize: '1.1em', lineHeight: 1 }}>৳</span>
)

const EMPTY_DEFAULTS: Partial<SimulationWizardInput> = {
  Impressions: 0,
  Clicks: 0,
  spend_meta: 0,
  spend_google: 0,
  spend_tiktok: 0,
  Total_Conversion: 0,
  revenue: 0,
  competitor_urls: "",
}

function NumberField({
  control,
  name,
  label,
  description,
  step,
  icon: Icon,
  placeholder,
  borderColor = "border-zinc-800/80",
  leftBorderColor = "",
}: {
  control: ReturnType<typeof useForm<SimulationWizardInput>>["control"]
  name: FieldPath<SimulationWizardInput>
  label: string
  description?: string
  step?: string
  icon?: React.ElementType
  placeholder?: string
  borderColor?: string
  leftBorderColor?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col gap-1.5">
          <FormLabel className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            {Icon && <Icon className="size-4 text-zinc-400" />}
            {label}
          </FormLabel>
          <FormControl>
            <div className={`relative rounded-xl overflow-hidden border ${borderColor} ${leftBorderColor} transition-all duration-300 focus-within:border-primary/50 bg-zinc-950/40 backdrop-blur-sm group hover:-translate-y-0.5 hover:shadow-lg`}>
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
                className="bg-transparent border-0 text-white placeholder:text-zinc-650 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 transition-all font-medium font-mono"
              />
            </div>
          </FormControl>
          {description ? (
            <FormDescription className="text-[11px] text-zinc-500 leading-tight px-1">{description}</FormDescription>
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
      fieldsToValidate = ["Impressions", "Clicks", "spend_meta", "spend_google", "spend_tiktok", "Total_Conversion", "revenue"]
    } else if (step === 1) {
      fieldsToValidate = ["age", "gender", "interest"]
    } else if (step === 2) {
      fieldsToValidate = ["competitor_urls"]
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

    // Parse competitor URLs from comma-separated string into array
    const competitorUrlList = values.competitor_urls
      ? values.competitor_urls
          .split(",")
          .map((u) => u.trim())
          .filter((u) => u.length > 0)
      : []

    const payload: SimulationRequest = {
      clerk_user_id: userId,
      endogenous: {
        Impressions: values.Impressions,
        Clicks: values.Clicks,
        spend_meta: values.spend_meta,
        spend_google: values.spend_google,
        spend_tiktok: values.spend_tiktok,
      },
      transactional: {
        Total_Conversion: values.Total_Conversion,
        revenue: values.revenue,
      },
      audience: {
        age: values.age,
        gender: values.gender,
        interest: values.interest,
      },
      ...(competitorUrlList.length > 0 && {
        exogenous: {
          competitor_urls: competitorUrlList,
        },
      }),
    }

    const result = await completeOnboarding(locale, payload)
    if (!result.success) {
      setSubmitError(result.error)
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.1)] text-white relative overflow-hidden transition-all duration-500">
      
      {/* Decorative background glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <CardHeader className="border-b border-zinc-800/60 pb-8 px-6 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span>Simulation Onboarding</span>
            </CardTitle>
            <CardDescription className="text-zinc-400 font-medium">
              Step {step + 1} of {STEPS.length}: {currentStep.title}
            </CardDescription>
          </div>
          <Button 
            type="button" 
            size="sm" 
            onClick={loadDemoPreset} 
            className="rounded-full bg-zinc-900 hover:bg-zinc-800/80 text-amber-400 border border-amber-500/20 px-5 h-11 flex items-center justify-center gap-2 self-start sm:self-center transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:border-amber-500/40"
          >
            <Sparkles className="size-4 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider">Demo Preset</span>
          </Button>
        </div>

        {/* Enhanced Progress Tracker */}
        <div className="mt-8 relative">
          <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-zinc-800 pointer-events-none" />
          
          {/* Animated active bar */}
          <div 
            className="absolute top-[18px] left-[10%] h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 pointer-events-none" 
            style={{ width: `${step === 0 ? '40%' : '80%'}` }}
          />

          <div className="flex justify-between items-center relative z-10 px-4">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isPast = i < step;
              const StepIcon = s.icon;
              return (
                <div key={s.title} className="flex flex-col items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 ${
                    isActive 
                      ? 'bg-indigo-600 border-primary text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110' 
                      : isPast 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}>
                    <StepIcon className="h-4.5 w-4.5" />
                  </div>
                  <span className={`text-[10px] uppercase font-black tracking-widest ${isActive ? 'text-primary' : 'text-zinc-500'}`}>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-sm text-zinc-400 text-center mt-6 italic font-medium leading-relaxed">"{currentStep.subtitle}"</p>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-8 pb-8 px-6 sm:px-8">
            
            {step === 0 && (
              <div className="space-y-6">
                {/* Row 1: Impressions & Clicks */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="Impressions"
                    label="Impressions"
                    description="Total historical ad impressions served."
                    icon={Eye}
                    placeholder="e.g., 50000"
                    leftBorderColor="border-l-4 border-l-blue-500"
                  />
                  <NumberField
                    control={form.control}
                    name="Clicks"
                    label="Clicks"
                    description="Total historical click interactions logged."
                    step="1"
                    icon={MousePointer}
                    placeholder="e.g., 2500"
                    leftBorderColor="border-l-4 border-l-purple-500"
                  />
                </div>

                {/* Row 2: Per-channel spend (Meta / Google / TikTok) */}
                <div className="grid gap-6 sm:grid-cols-3">
                  <NumberField
                    control={form.control}
                    name="spend_meta"
                    label="Meta Ads Budget"
                    description="Historical Meta / Facebook ad spend."
                    icon={TakaIcon}
                    placeholder="e.g., 75000"
                    leftBorderColor="border-l-4 border-l-blue-600"
                  />
                  <NumberField
                    control={form.control}
                    name="spend_google"
                    label="Google Ads Budget"
                    description="Historical Google Ads spend."
                    icon={TakaIcon}
                    placeholder="e.g., 50000"
                    leftBorderColor="border-l-4 border-l-red-500"
                  />
                  <NumberField
                    control={form.control}
                    name="spend_tiktok"
                    label="TikTok Ads Budget"
                    description="Historical TikTok Ads spend."
                    icon={TakaIcon}
                    placeholder="e.g., 25000"
                    leftBorderColor="border-l-4 border-l-cyan-400"
                  />
                </div>

                {/* Row 3: Revenue & Conversions */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="revenue"
                    label="Historical Total Revenue"
                    description="Total revenue generated across all channels."
                    icon={TakaIcon}
                    placeholder="e.g., 500000"
                    leftBorderColor="border-l-4 border-l-emerald-500"
                  />
                  <NumberField
                    control={form.control}
                    name="Total_Conversion"
                    label="Total Conversion"
                    description="Historical conversion counts logged."
                    step="1"
                    icon={Target}
                    placeholder="e.g., 150"
                    leftBorderColor="border-l-4 border-l-pink-500"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* Age Field */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Age Range</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-zinc-950/40 border-zinc-800/80 text-white rounded-xl h-12 focus:ring-primary/45 transition-all">
                            <SelectValue placeholder="Select target age group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-zinc-800/80 text-white rounded-xl">
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
                    <FormItem className="flex flex-col gap-1.5">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-zinc-950/40 border-zinc-800/80 text-white rounded-xl h-12 focus:ring-primary/45 transition-all">
                            <SelectValue placeholder="Select target gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-zinc-800/80 text-white rounded-xl">
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
                    <FormItem className="sm:col-span-2 flex flex-col gap-1.5">
                      <FormLabel className="text-sm font-semibold text-zinc-300">Core Interest / Behavioral Segment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-zinc-950/40 border-zinc-800/80 text-white rounded-xl h-12 focus:ring-primary/45 transition-all">
                            <SelectValue placeholder="Select audience interest vertical" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-zinc-800/80 text-white rounded-xl max-h-[220px] overflow-y-auto">
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

            {step === 2 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="competitor_urls"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                        <Link className="size-4 text-zinc-400" />
                        Competitor URLs
                      </FormLabel>
                      <FormControl>
                        <div className="relative rounded-xl overflow-hidden border border-zinc-800/80 border-l-4 border-l-amber-500 transition-all duration-300 focus-within:border-primary/50 bg-zinc-950/40 backdrop-blur-sm group hover:-translate-y-0.5 hover:shadow-lg">
                          <textarea
                            {...field}
                            placeholder="https://daraz.com.bd, https://chaldal.com"
                            className="w-full bg-transparent border-0 text-white placeholder:text-zinc-650 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[120px] p-4 transition-all font-medium font-mono resize-y"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px] text-zinc-500 leading-tight px-1">
                        Provide comma-separated URLs of competitor websites. These will be dynamically scraped to adjust simulation baselines. MUST be valid HTTP/HTTPS URLs.
                      </FormDescription>
                      <FormMessage className="text-xs text-destructive font-semibold" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {submitError ? (
              <p className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3.5 text-sm text-destructive font-semibold animate-shake">
                {submitError}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-between gap-4 border-t border-zinc-850/80 pt-8 pb-8 px-6 sm:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
              className="rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all px-5 h-12 flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <div className="flex gap-2">
              {!isLastStep ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="rounded-xl bg-white text-black hover:bg-zinc-200 transition-all font-bold px-6 h-12 flex items-center gap-1.5 shadow-lg shadow-white/5"
                >
                  <span>Continue</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !isLoaded || !userId}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:opacity-90 transition-opacity text-white font-bold shadow-xl shadow-indigo-500/25 px-6 h-12 flex items-center justify-center"
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
