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
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black">
      <div className="w-full max-w-3xl">
        {/* Блок покупки доступа */}
        <div className="relative bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 lg:p-8 shadow-xl overflow-hidden">
          <div className="relative space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
                          border border-zinc-700 bg-zinc-900 text-zinc-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>Премиум-доступ без подписки</span>
            </div>

            {/* Заголовок */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Вечный доступ к улучшению промтов
              </h1>
              <p className="text-zinc-400 text-sm">
                10 улучшений — бесплатно, далее единовременный платёж 99₽.
                Никаких подписок и скрытых комиссий.
              </p>
            </div>

            {/* Информация о лимите */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 
                              text-zinc-200 text-xs">
                  Осталось <strong className="text-white">{state.isPaid ? '∞' : attemptsLeft}</strong> из {FREE_LIMIT} бесплатных улучшений
                </div>
                <div className="flex-1 min-w-[120px] h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-zinc-200 transition-all duration-300"
                    style={{ width: state.isPaid ? '100%' : `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-zinc-500 text-xs">
                {state.isPaid 
                  ? 'Доступ активен: лимиты на улучшения промтов сняты навсегда.'
                  : attemptsLeft > 0
                    ? 'До исчерпания лимита вы можете продолжать пользоваться сервисом бесплатно.'
                    : 'Лимит бесплатных улучшений исчерпан. Оформите вечный доступ, чтобы продолжить.'}
              </p>
            </div>

            {/* Статус */}
            <div className={`text-xs ${state.isPaid ? 'text-zinc-300' : 'text-zinc-300'}`}>
              Статус: <strong className="text-white">
                {state.isPaid ? 'Оплаченный доступ' : 'Бесплатный доступ'}
              </strong>
            </div>

            {/* Секция покупки */}
            {!state.isPaid ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-2">
                    Единовременный платёж
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xl font-semibold text-white">99₽</span>
                    <span className="text-xs text-zinc-600 line-through">299₽</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Разовая оплата, доступ навсегда.
                  </div>
                </div>

                <button
                  onClick={handleBuyClick}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl bg-white text-zinc-900 font-medium text-sm flex items-center justify-center gap-2
                           border border-zinc-300 hover:bg-zinc-50 transition-all duration-150
                           disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="text-base">₽</span>
                  <span>Купить вечный доступ за 99₽</span>
                </button>

                {message && (
                  <div className={`p-3 rounded-xl text-xs border ${
                    message.type === 'success' 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      : message.type === 'error'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
                            bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>
                  <strong className="text-white">Доступ активен</strong> — улучшайте промты без ограничений.
                </span>
              </div>
            )}

            {/* Ссылка назад */}
            <div className="pt-4">
              <Link 
                href="/"
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
              >
                ← Вернуться к улучшению промтов
              </Link>
            </div>
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

