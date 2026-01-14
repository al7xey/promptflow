"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const FREE_LIMIT = 10;
const LS_KEYS = {
  isPaid: 'pf_access_paid',
  usedCount: 'pf_free_used'
};

interface UserState {
  isPaid: boolean;
  usedCount: number;
}

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<UserState>({ isPaid: false, usedCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Загрузка состояния из localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadState = (): UserState => {
      try {
        const isPaid = localStorage.getItem(LS_KEYS.isPaid) === 'true';
        const usedCountStr = localStorage.getItem(LS_KEYS.usedCount) || '0';
        const usedCount = parseInt(usedCountStr, 10);
        return {
          isPaid,
          usedCount: Number.isFinite(usedCount) && usedCount >= 0 ? usedCount : 0
        };
      } catch (error) {
        console.error('Ошибка чтения localStorage:', error);
        return { isPaid: false, usedCount: 0 };
      }
    };
    setState(loadState());
  }, []);

  // Проверка возврата с ЮKassa
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const paymentStatus = searchParams.get('payment') || searchParams.get('access');
    // Безопасная проверка параметров
    if (paymentStatus && (paymentStatus === 'success' || paymentStatus === 'activated')) {
      try {
        const newState = { isPaid: true, usedCount: 0 };
        localStorage.setItem(LS_KEYS.isPaid, 'true');
        localStorage.setItem(LS_KEYS.usedCount, '0');
        setState(newState);
        setMessage({ text: 'Оплата успешно завершена. Доступ активен.', type: 'success' });
        
        // Очистка URL параметров
        if (window.history.replaceState) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (error) {
        console.error('Ошибка сохранения состояния оплаты:', error);
        setMessage({ text: 'Ошибка при активации доступа. Обратитесь в поддержку.', type: 'error' });
      }
    }
  }, [searchParams]);

  const attemptsLeft = Math.max(0, FREE_LIMIT - state.usedCount);
  const usedClamped = Math.min(state.usedCount, FREE_LIMIT);
  const progressPercent = Math.min(100, (usedClamped / FREE_LIMIT) * 100);

  const handleBuyClick = async () => {
    if (state.isPaid) {
      setMessage({ text: 'Доступ уже активирован. Повторная оплата не требуется.', type: 'info' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: 'Перенаправляем вас на оплату через ЮKassa...', type: 'info' });

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 99,
          currency: 'RUB',
          type: 'lifetime_access'
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при создании платежа: ' + response.status);
      }

      const result = await response.json();

      // Безопасная проверка URL перед редиректом
      if (result && result.confirmationUrl && typeof result.confirmationUrl === 'string') {
        // Проверка, что URL от ЮKassa
        const url = result.confirmationUrl;
        if (url.startsWith('https://yookassa.ru/') || url.startsWith('https://yoomoney.ru/')) {
          if (result.paymentId && typeof result.paymentId === 'string') {
            try {
              sessionStorage.setItem('pf_last_payment_id', result.paymentId);
            } catch (e) {
              console.warn('Не удалось сохранить paymentId в sessionStorage:', e);
            }
          }
          window.location.href = url;
        } else {
          throw new Error('Некорректный URL подтверждения платежа');
        }
      } else {
        throw new Error('Некорректный ответ сервера.');
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: 'Не удалось создать платёж. Попробуйте ещё раз или обратитесь в поддержку.', 
        type: 'error' 
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[2fr_1.5fr] gap-6 lg:gap-8">
        {/* Левая часть: покупка доступа */}
        <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/90 
                        border border-zinc-800 rounded-3xl p-6 sm:p-7 lg:p-8 
                        shadow-2xl overflow-hidden">
          {/* Декоративный фон */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
                          border border-zinc-700 bg-zinc-900/50 text-zinc-400 text-xs 
                          uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
              <span>Премиум-доступ без подписки</span>
            </div>

            {/* Заголовок */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-3">
                Вечный доступ к улучшению промтов
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                10 улучшений — бесплатно, далее единовременный платёж 99₽.
                Никаких подписок и скрытых комиссий.
              </p>
            </div>

            {/* Информация о лимите */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 
                              text-zinc-300 text-sm">
                  Осталось <strong className="text-white">{state.isPaid ? '∞' : attemptsLeft}</strong> из {FREE_LIMIT} бесплатных улучшений
                </div>
                <div className="flex-1 min-w-[120px] h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                    style={{ width: state.isPaid ? '100%' : `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-zinc-500 text-xs sm:text-sm">
                {state.isPaid 
                  ? 'Доступ активен: лимиты на улучшения промтов сняты навсегда.'
                  : attemptsLeft > 0
                    ? 'До исчерпания лимита вы можете продолжать пользоваться сервисом бесплатно.'
                    : 'Лимит бесплатных улучшений исчерпан. Оформите вечный доступ, чтобы продолжить.'}
              </p>
            </div>

            {/* Статус */}
            <div className={`text-sm ${state.isPaid ? 'text-green-400' : 'text-zinc-400'}`}>
              Статус: <strong className={state.isPaid ? 'text-green-300' : 'text-white'}>
                {state.isPaid ? 'Оплаченный доступ' : 'Бесплатный доступ'}
              </strong>
            </div>

            {/* Секция покупки */}
            {!state.isPaid ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                    Единовременный платёж
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-white">99₽</span>
                    <span className="text-sm text-zinc-500 line-through">299₽</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Разовая оплата, доступ навсегда.
                  </div>
                </div>

                <button
                  onClick={handleBuyClick}
                  disabled={isLoading}
                  className="w-full px-6 py-4 rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 
                           text-zinc-950 font-semibold text-base flex items-center justify-center gap-3
                           shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40
                           transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                           disabled:hover:shadow-lg"
                >
                  <span className="w-5 h-5 rounded-full bg-zinc-950/20 flex items-center justify-center text-sm">
                    ₽
                  </span>
                  <span>Купить вечный доступ за 99₽</span>
                  <span className="text-xs opacity-90">Оплата через ЮKassa</span>
                </button>

                {message && (
                  <div className={`p-3 rounded-lg text-sm border ${
                    message.type === 'success' 
                      ? 'bg-green-950/20 border-green-900/50 text-green-400'
                      : message.type === 'error'
                        ? 'bg-red-950/20 border-red-900/50 text-red-400'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full 
                            bg-green-950/30 border border-green-800/50 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                <span className="font-medium">
                  <strong>Доступ активен</strong> — улучшайте промты без ограничений.
                </span>
              </div>
            )}

            {/* Ссылка назад */}
            <div className="pt-4">
              <Link 
                href="/"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
              >
                ← Вернуться к улучшению промтов
              </Link>
            </div>
          </div>
        </div>

        {/* Правая часть: демо улучшения промта */}
        <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-950 
                        border border-zinc-800 rounded-2xl p-5 sm:p-6 
                        shadow-xl overflow-hidden">
          {/* Декоративный фон */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Демо улучшения промта</h2>
              <div className={`px-2.5 py-1 rounded-full text-xs border ${
                state.isPaid 
                  ? 'bg-green-950/30 border-green-800/50 text-green-400'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
              }`}>
                {state.isPaid ? 'Премиум-режим' : 'Бесплатный режим'}
              </div>
            </div>

            <div className="text-sm text-zinc-400">
              Использовано улучшений: <strong className="text-white">
                {state.isPaid ? '∞' : usedClamped}
              </strong> / {FREE_LIMIT}
            </div>

            <button
              onClick={() => {
                if (!state.isPaid && state.usedCount >= FREE_LIMIT) return;
                
                try {
                  const newUsedCount = state.isPaid ? state.usedCount : state.usedCount + 1;
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(LS_KEYS.usedCount, String(newUsedCount));
                  }
                  setState({ ...state, usedCount: newUsedCount });

                  const now = new Date();
                  const timeString = now.toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  });

                  const demoOutput = document.getElementById('demo-output');
                  if (demoOutput) {
                    // Безопасное обновление текста без innerHTML
                    const message = state.isPaid
                      ? `[${timeString}] Промт улучшен. У вас активен вечный доступ — лимиты не применяются.`
                      : `[${timeString}] Промт улучшен. Вы использовали ${newUsedCount} из ${FREE_LIMIT} бесплатных улучшений.`;
                    demoOutput.textContent = message;
                  }
                } catch (error) {
                  console.error('Ошибка при обновлении состояния:', error);
                }
              }}
              disabled={!state.isPaid && state.usedCount >= FREE_LIMIT}
              className="w-full px-4 py-2.5 rounded-full border border-zinc-700 bg-zinc-900/50 
                       text-zinc-200 text-sm font-medium flex items-center justify-center gap-2
                       hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                ⚡
              </span>
              <span>
                {state.isPaid 
                  ? 'Улучшить промт (без ограничений)'
                  : state.usedCount >= FREE_LIMIT
                    ? 'Лимит исчерпан'
                    : 'Улучшить промт'}
              </span>
            </button>

            <div 
              id="demo-output"
              className="min-h-[120px] p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 
                       text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap"
            >
              Нажмите «Улучшить промт», чтобы симулировать использование сервиса и уменьшить количество бесплатных попыток.
            </div>

            {/* Оверлей при исчерпанном лимите */}
            {!state.isPaid && state.usedCount >= FREE_LIMIT && (
              <div className="absolute inset-0 bg-zinc-950/95 border border-red-900/50 rounded-2xl 
                            flex flex-col items-center justify-center text-center p-6 gap-3 z-20">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-lg font-semibold text-white">Бесплатный лимит исчерпан</div>
                <div className="text-sm text-zinc-400 max-w-xs">
                  Вы использовали 10 бесплатных улучшений. Чтобы продолжить, оформите вечный доступ всего за 99₽.
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  Нажмите кнопку «Купить вечный доступ за 99₽» слева.
                </div>
                <button
                  onClick={() => {
                    const buyButton = document.querySelector('button[onclick*="handleBuyClick"]');
                    if (buyButton) {
                      (buyButton as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 mt-2"
                >
                  Перейти к оплате
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-zinc-400">Загрузка...</div>
      </main>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}

