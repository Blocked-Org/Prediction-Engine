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
    streamProtocol: 'text',
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
    <Card className="mt-6 w-full shadow-sm border border-[#E5E5E5] relative overflow-hidden transition-all hover:shadow-md duration-300 rounded-2xl bg-white">
      {/* Animated Progress Bar at top of Card when generating */}
      {isLoading && (
        <div className="absolute top-0 inset-x-0 h-1 bg-[#E5E5E5] overflow-hidden z-30">
          <div className="h-full bg-[#FACC15] animate-pulse w-full" />
        </div>
      )}
      
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 font-noto-bengali">
            <Bot className="h-6 w-6 text-[#0A0A0A]" />
            {t('title')}
          </CardTitle>
          <CardDescription className="font-noto-bengali text-[#6B6B6B]">
            {t('description')}
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-3">
          {provider === 'offline' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[#F5F5F0] text-[#0A0A0A] border border-[#E5E5E5] rounded-full animate-in fade-in zoom-in duration-300 shadow-sm shrink-0">
              <Zap className="h-3 w-3 fill-current text-[#0A0A0A]" />
              <span>No Cloud Required</span>
            </div>
          )}
          
          {/* Segmented Control */}
          <div className="relative flex items-center bg-[#F5F5F0] p-1 rounded-xl font-noto-bengali border border-[#E5E5E5] shrink-0">
            {/* Sliding background indicator */}
            <div 
              className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm border border-[#E5E5E5] transition-all duration-300 ease-out"
              style={{
                left: provider === 'cloud' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            <button 
              onClick={() => setProvider('cloud')}
              className={`relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 w-24 cursor-pointer ${
                provider === 'cloud' 
                  ? 'text-[#0A0A0A]' 
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              <Cloud className={`h-4 w-4 transition-all duration-300 ${provider === 'cloud' ? 'scale-110 text-[#0A0A0A]' : 'text-[#6B6B6B]'}`} />
              {t('cloud')}
            </button>
            <button 
              onClick={() => setProvider('offline')}
              className={`relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 w-24 cursor-pointer ${
                provider === 'offline' 
                  ? 'text-[#0A0A0A]' 
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              <Server className={`h-4 w-4 transition-all duration-300 ${provider === 'offline' ? 'scale-110 text-[#0A0A0A]' : 'text-[#6B6B6B]'}`} />
              {t('offline')}
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-widest flex items-center gap-1 pl-0.5">
            ✨ AI-Powered
          </span>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white h-11 px-4 py-2.5 rounded-full font-bold shadow-sm transition-all duration-300 hover:bg-[#333] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed font-noto-bengali cursor-pointer text-sm uppercase tracking-wide"
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
          <div className="flex items-start gap-2 p-4 text-sm text-[#EF4444] bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl font-noto-bengali">
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
          <div className="relative mt-4 p-6 bg-[#F5F5F0] text-[#0A0A0A] rounded-2xl border border-[#E5E5E5] shadow-sm font-noto-bengali group/output overflow-hidden">
            {/* Subtle border-left accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FACC15] rounded-l-2xl" />
            
            {/* Copy to Clipboard button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E5E5E5] hover:bg-[#F5F5F0] text-[#0A0A0A] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <span className="text-[#0A0A0A]">✓</span>
                    <span className="text-[#0A0A0A]">Copied</span>
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
            <div className="prose max-w-none pr-10 pl-2
              prose-headings:text-[#0A0A0A] prose-strong:text-[#0A0A0A] prose-code:text-[#0A0A0A]
              prose-code:bg-white prose-code:border prose-code:border-[#E5E5E5] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown>{completion}</ReactMarkdown>
              {isLoading && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-[#0A0A0A] animate-pulse align-middle" />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

