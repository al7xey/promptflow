"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { ApiResponse } from "./types";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Введите запрос для улучшения");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    setHasRequested(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Ошибка при генерации промпта");
      }

      setResult(data.data || null);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка. Попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Ошибка копирования:", err);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            PromptFlow
          </h1>
          <p className="text-zinc-400 text-sm">
            Превращаем короткие запросы в глубокие промпты для нейросетей
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос здесь..."
            className="w-full h-32 px-4 py-3 bg-transparent border border-zinc-800 rounded-lg 
                     text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-[1.5px]
                     focus:ring-zinc-700 focus:border-zinc-700 resize-none transition-colors
                     text-lg"
            disabled={isLoading}
          />

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-zinc-800 to-zinc-900 
                     border border-zinc-800 rounded-lg text-white font-medium
                     hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] 
                     hover:border-zinc-700 transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                     flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Генерация...</span>
                </>
              ) : (
                "Улучшить промпт"
              )}
            </button>

            {hasRequested && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg
                         text-zinc-200 text-sm font-medium whitespace-nowrap
                         hover:bg-zinc-800 hover:border-zinc-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Обновить"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 border border-zinc-800 rounded-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              <p className="text-zinc-400 text-sm animate-pulse">
                Генерируем улучшенный промпт...
              </p>
            </div>
          </div>
        )}

        {/* Result Section */}
        {result && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-200">
                Улучшенный промпт
              </h2>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg
                         hover:bg-zinc-800 transition-colors flex items-center gap-2
                         text-sm text-zinc-300"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Копировать</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg
                          prose prose-invert prose-headings:text-zinc-100 
                          prose-p:text-zinc-300 prose-strong:text-zinc-100
                          prose-code:text-zinc-200 prose-pre:bg-zinc-950
                          prose-pre:border prose-pre:border-zinc-800
                          prose-ul:text-zinc-300 prose-ol:text-zinc-300
                          prose-li:text-zinc-300 prose-blockquote:text-zinc-400
                          prose-blockquote:border-zinc-700 prose-h1:text-2xl
                          prose-h2:text-xl prose-h3:text-lg
                          max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ node, inline, className, children, ...props }: any) => {
                    return inline ? (
                      <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200 text-sm" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block p-4 bg-zinc-950 border border-zinc-800 rounded-lg overflow-x-auto text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

