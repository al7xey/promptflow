"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Copy, Check, Loader2, RefreshCw, Lock } from "lucide-react";
import { ApiResponse } from "./types";

const FREE_LIMIT = 10;
const LS_KEYS = {
  isPaid: "pf_access_paid",
  usedCount: "pf_free_used",
  bonusBlocks: "pf_bonus_blocks", // количество пакетов по +10 попыток за рекламу
};

interface UserState {
  isPaid: boolean;
  usedCount: number;
  bonusBlocks: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [userState, setUserState] = useState<UserState>({
    isPaid: false,
    usedCount: 0,
    bonusBlocks: 0,
  });
  const [isAdRewardLoading, setIsAdRewardLoading] = useState(false);

  // Загрузка состояния из localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadState = (): UserState => {
      try {
        const isPaid = localStorage.getItem(LS_KEYS.isPaid) === "true";
        const usedCountStr = localStorage.getItem(LS_KEYS.usedCount) || "0";
        const bonusBlocksStr = localStorage.getItem(LS_KEYS.bonusBlocks) || "0";
        const usedCount = parseInt(usedCountStr, 10);
        const bonusBlocks = parseInt(bonusBlocksStr, 10);
        return {
          isPaid,
          usedCount: Number.isFinite(usedCount) && usedCount >= 0 ? usedCount : 0,
          bonusBlocks:
            Number.isFinite(bonusBlocks) && bonusBlocks >= 0 ? bonusBlocks : 0,
        };
      } catch (error) {
        console.error("Ошибка чтения localStorage:", error);
        return { isPaid: false, usedCount: 0, bonusBlocks: 0 };
      }
    };
    setUserState(loadState());
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Введите запрос для улучшения");
      return;
    }

    // Проверка лимита бесплатных попыток
    if (!userState.isPaid && userState.usedCount >= FREE_LIMIT) {
      setError("Бесплатный лимит исчерпан. Оформите вечный доступ для продолжения.");
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

      // Увеличиваем счетчик использованных попыток только при успешной генерации
      if (!userState.isPaid) {
        try {
          const newUsedCount = userState.usedCount + 1;
          if (typeof window !== "undefined") {
            localStorage.setItem(LS_KEYS.usedCount, String(newUsedCount));
          }
          setUserState({ ...userState, usedCount: newUsedCount });
        } catch (error) {
          console.error("Ошибка сохранения состояния:", error);
        }
      }
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

  const totalFreeLimit =
    FREE_LIMIT + (userState.isPaid ? 0 : userState.bonusBlocks * 10);
  const attemptsLeft = Math.max(0, totalFreeLimit - userState.usedCount);
  const canGenerate = userState.isPaid || attemptsLeft > 0;

  const handleAdReward = async () => {
    if (userState.isPaid || isAdRewardLoading) return;

    // Разрешаем получать бонус только если базовый лимит уже израсходован
    if (attemptsLeft > 0) {
      setError(
        "Сначала используйте текущие бесплатные улучшения, затем можно получить ещё 10 за просмотр рекламы."
      );
      return;
    }

    setIsAdRewardLoading(true);
    setError(null);

    try {
      /*
        Здесь должен быть вызов SDK рекламной сети.
        После успешного просмотра рекламы вызываем начисление бонуса.
      */

      await new Promise((resolve) => setTimeout(resolve, 1500)); // имитация ожидания рекламы

      const newBonusBlocks = userState.bonusBlocks + 1;
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEYS.bonusBlocks, String(newBonusBlocks));
      }
      setUserState({ ...userState, bonusBlocks: newBonusBlocks });
    } catch (e) {
      console.error("Ошибка при начислении бонуса за рекламу:", e);
      setError("Не удалось получить бонус за рекламу. Попробуйте ещё раз позже.");
    } finally {
      setIsAdRewardLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">
            PromptFlow
          </h1>
          <p className="text-zinc-400 text-sm">
            Превращаем короткие запросы в глубокие промпты для нейросетей
          </p>
        </div>

        {/* Информация о лимите и статусе */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full border ${
                userState.isPaid 
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200'
              }`}>
                {userState.isPaid ? '✓ Премиум-доступ' : 'Бесплатный доступ'}
              </span>
              {!userState.isPaid && (
                <span className="text-xs text-zinc-500">
                  Осталось: <strong className="text-zinc-300">{attemptsLeft}</strong> / {totalFreeLimit}
                </span>
              )}
            </div>
            <Link
              href="/payment"
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Купить вечный доступ за 99₽
            </Link>
          </div>
          {!userState.isPaid && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className="h-full rounded-full bg-zinc-200 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (userState.usedCount / Math.max(1, totalFreeLimit)) * 100
                  )}%`,
                }}
              />
            </div>
          )}

          {!userState.isPaid && attemptsLeft === 0 && (
            <div className="pt-2 flex flex-wrap gap-2 justify-between items-center">
              <span className="text-xs text-zinc-500">
                Бесплатный лимит исчерпан. Можно получить ещё 10 улучшений за просмотр рекламы.
              </span>
              <button
                type="button"
                onClick={handleAdReward}
                disabled={isAdRewardLoading}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200
                         hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAdRewardLoading ? "Начисляем бонус..." : "+10 улучшений за рекламу"}
              </button>
            </div>
          )}
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
              disabled={isLoading || !prompt.trim() || !canGenerate}
              className="flex-1 px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-medium
                     hover:bg-zinc-700 hover:border-zinc-600 transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Генерация...</span>
                </>
              ) : !canGenerate ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Лимит исчерпан</span>
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
            {!canGenerate && (
              <Link
                href="/payment"
                className="mt-3 inline-block px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 
                         text-white text-sm font-semibold rounded-lg hover:shadow-lg 
                         hover:shadow-orange-500/30 transition-all duration-200"
              >
                Купить вечный доступ за 99₽
              </Link>
            )}
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
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg
                       hover:bg-zinc-800 transition-colors flex items-center gap-2
                       text-sm text-zinc-300 z-10"
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

            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg
                          prose prose-invert prose-headings:text-zinc-100 
                          prose-p:text-zinc-300 prose-strong:text-zinc-100
                          prose-code:text-zinc-200 prose-pre:bg-zinc-950
                          prose-pre:border prose-pre:border-zinc-800
                          prose-ul:text-zinc-300 prose-ol:text-zinc-300
                          prose-li:text-zinc-300 prose-blockquote:text-zinc-400
                          prose-blockquote:border-zinc-700 prose-h1:text-xl
                          prose-h2:text-lg prose-h3:text-base
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

