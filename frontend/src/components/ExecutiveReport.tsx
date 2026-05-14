"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, Cloud, Server, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocale, useTranslations } from 'next-intl';
import { SimulationScenario, OptimizationResult } from '@/lib/types/contracts'

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
  
  const [completion, setCompletion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setCompletion('');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationData, locale, provider })
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const text = await res.text();
      setCompletion(text);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6 w-full shadow-lg border-primary/20">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 font-noto-bengali">
            <Bot className="h-6 w-6 text-primary" />
            {t('title')}
          </CardTitle>
          <CardDescription className="font-noto-bengali">
            {t('description')}
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-3 bg-muted p-2 rounded-lg self-start md:self-auto font-noto-bengali">
          <button 
            onClick={() => setProvider('cloud')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              provider === 'cloud' 
                ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cloud className="h-4 w-4" />
            {t('cloud')}
          </button>
          <button 
            onClick={() => setProvider('offline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              provider === 'offline' 
                ? 'bg-white dark:bg-zinc-800 shadow-sm text-green-600 dark:text-green-400' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="h-4 w-4" />
            {t('offline')}
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 font-noto-bengali"
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

        {error && (
          <div className="flex items-start gap-2 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-md font-noto-bengali">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('generation_failed')}</p>
              <p className="opacity-90 mt-1">
                {error.message || (
                  provider === 'offline'
                    ? 'Failed to connect to local Ollama. Is Gemma4:26b loaded?'
                    : 'Failed to connect to Google Gemini. Check GOOGLE_GENERATIVE_AI_API_KEY.'
                )}
              </p>
            </div>
          </div>
        )}

        {completion && (
          <div className="mt-4 p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border prose dark:prose-invert max-w-none font-noto-bengali">
            <ReactMarkdown>{completion}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
