import { NextRequest, NextResponse } from "next/server";

/**
 * API Route для создания платежа через ЮKassa
 * 
 * ВАЖНО: Для работы этого endpoint необходимо:
 * 1. Установить SDK ЮKassa для Node.js: npm install @yookassa/sdk
 * 2. Настроить переменные окружения:
 *    - YOOKASSA_SHOP_ID - ID магазина в ЮKassa
 *    - YOOKASSA_SECRET_KEY - Секретный ключ магазина
 * 3. Настроить return_url в настройках магазина ЮKassa:
 *    https://ваш-домен/payment?payment=success
 * 
 * В продакшене рекомендуется также настроить webhook для подтверждения оплаты.
 */

interface PaymentRequest {
  amount: number;
  currency: string;
  type: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { amount, currency } = body;

    // Валидация
    if (!amount || amount !== 99) {
      return NextResponse.json(
        { error: "Некорректная сумма платежа" },
        { status: 400 }
      );
    }

    if (currency !== "RUB") {
      return NextResponse.json(
        { error: "Поддерживается только валюта RUB" },
        { status: 400 }
      );
    }

    // Получение учетных данных из переменных окружения
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      console.error("YOOKASSA_SHOP_ID или YOOKASSA_SECRET_KEY не настроены");
      return NextResponse.json(
        { error: "Платежная система не настроена. Обратитесь к администратору." },
        { status: 500 }
      );
    }

    // Создание платежа через ЮKassa API
    // Примечание: Здесь используется прямой вызов API, но рекомендуется использовать официальный SDK
    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: currency,
      },
      capture: true,
      description: "Вечный доступ к сервису улучшения промтов",
      confirmation: {
        type: "redirect",
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/payment?payment=success`,
      },
      metadata: {
        type: "lifetime_access",
      },
    };

    // Вызов API ЮKassa для создания платежа
    const yooKassaResponse = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": `${Date.now()}-${Math.random()}`,
        "Authorization": `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!yooKassaResponse.ok) {
      const errorText = await yooKassaResponse.text();
      console.error("Ошибка ЮKassa API:", errorText);
      return NextResponse.json(
        { error: "Не удалось создать платеж. Попробуйте позже." },
        { status: 500 }
      );
    }

    const paymentResult = await yooKassaResponse.json();

    // Возвращаем URL для подтверждения платежа
    if (paymentResult.confirmation && paymentResult.confirmation.confirmation_url) {
      return NextResponse.json({
        confirmationUrl: paymentResult.confirmation.confirmation_url,
        paymentId: paymentResult.id,
      });
    } else {
      return NextResponse.json(
        { error: "Некорректный ответ от платежной системы" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Ошибка при создании платежа:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

