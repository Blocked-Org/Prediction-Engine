"use client"

import { useState, useEffect, useRef } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, Cloud, Server, Loader2, AlertCircle, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { SimulationScenario, OptimizationResult } from '@/lib/types/contracts'
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <div className="h-12 flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>
});

type SimulationData = {
  simulation_scenario: SimulationScenario;
  optimization_result: OptimizationResult;
}

interface ExecutiveReportProps {
  simulationData: SimulationData;
}

export function ExecutiveReport({ simulationData }: ExecutiveReportProps) {
  const locale = useLocale();
  const t = useTranslations('ExecutiveReport');
  const [provider, setProvider] = useState<'cloud' | 'offline'>('cloud');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { completion, complete, isLoading, error, stop } = useCompletion({
    api: '/api/report',
    body: {
      simulationData,
      locale,
      provider
    },
    onError: (err) => {
      console.error('Completion error:', err);
    }
  });

  // Safety net: if loading hangs for 15 seconds with no output, force-stop
  useEffect(() => {
    if (isLoading && !completion) {
      timeoutRef.current = setTimeout(() => {
        console.warn('Executive report generation timed out — stopping.');
        stop();
      }, 15000);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, completion, stop]);

  const handleGenerate = () => {
    complete('Please generate the Executive Summary.');
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!completion) return;
    navigator.clipboard.writeText(completion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mt-6 w-full shadow-lg border-indigo-500/20 relative overflow-hidden card-hover-lift hover:shadow-indigo-500/5 duration-300">
      {/* Animated Progress Bar at top of Card when generating */}
      {isLoading && (
        <div className="absolute top-0 inset-x-0 h-1 bg-muted/30 overflow-hidden z-30">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 animate-pulse w-full" />
        </div>
      )}
      
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 font-noto-bengali">
            <Bot className="h-6 w-6 text-indigo-500" />
            {t('title')}
          </CardTitle>
          <CardDescription className="font-noto-bengali">
            {t('description')}
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-3">
          {provider === 'offline' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-in fade-in zoom-in duration-300 shadow-sm shrink-0">
              <Zap className="h-3 w-3 fill-current animate-pulse text-emerald-400" />
              <span>No Cloud Required</span>
            </div>
          )}
          
          {/* Segmented Control */}
          <div className="relative flex items-center bg-muted p-1 rounded-xl font-noto-bengali border border-border/40 shrink-0">
            {/* Sliding background indicator */}
            <div 
              className="absolute top-1 bottom-1 rounded-lg bg-card shadow-sm border border-border/20 transition-all duration-300 ease-out"
              style={{
                left: provider === 'cloud' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            <button 
              onClick={() => setProvider('cloud')}
              className={`relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 w-24 cursor-pointer ${
                provider === 'cloud' 
                  ? 'text-blue-400' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cloud className={`h-4 w-4 transition-all duration-300 ${provider === 'cloud' ? 'scale-110 text-blue-400' : 'text-muted-foreground'}`} />
              {t('cloud')}
            </button>
            <button 
              onClick={() => setProvider('offline')}
              className={`relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 w-24 cursor-pointer ${
                provider === 'offline' 
                  ? 'text-emerald-400' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Server className={`h-4 w-4 transition-all duration-300 ${provider === 'offline' ? 'scale-110 text-emerald-400' : 'text-muted-foreground'}`} />
              {t('offline')}
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1 pl-0.5">
            ✨ AI-Powered
          </span>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white h-11 px-4 py-2.5 rounded-lg font-bold shadow-lg transition-all duration-300 hover:shadow-indigo-500/30 hover:scale-[1.005] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed font-noto-bengali cursor-pointer bg-[length:200%_auto] hover:bg-right"
            style={{
              backgroundSize: '200% 100%',
              animation: isLoading ? 'none' : 'shimmer 4s linear infinite',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('generating')}
              </>
            ) : (
              t('generate')
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-md font-noto-bengali">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('generation_failed')}</p>
              <p className="opacity-90 mt-1">
                {error.message || (
                  provider === 'offline'
                    ? 'Failed to connect to local Ollama. Is gemma4:26b loaded?'
                    : 'Failed to connect to Google Gemini. Check GOOGLE_GENERATIVE_AI_API_KEY.'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton while generating */}
        {isLoading && !completion && (
          <LoadingOverlay absolute className="min-h-[160px]" />
        )}

        {completion && (
          <div className="relative mt-4 p-6 bg-slate-950 text-slate-100 rounded-lg border border-slate-800/80 shadow-2xl font-noto-bengali group/output overflow-hidden">
            {/* Subtle border-left gradient */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-600" />
            
            {/* Copy to Clipboard button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <span className="text-emerald-400">✓</span>
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Markdown Output */}
            <div className="prose dark:prose-invert max-w-none prose-slate pr-10 pl-2
              prose-headings:text-slate-100 prose-strong:text-indigo-300 prose-code:text-indigo-400
              prose-code:bg-slate-900/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown>{completion}</ReactMarkdown>
              {isLoading && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

