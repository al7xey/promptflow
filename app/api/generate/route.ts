import { NextResponse } from "next/server";
import https from "https";
import type { GigaChatTokenResponse, GigaChatResponse } from "@/app/types";

// Функция для выполнения HTTPS запроса с отключенной проверкой SSL (только для разработки!)
function httpsRequest(url: string, options: https.RequestOptions, data?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const       requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
      // Отключаем проверку SSL для GigaChat (у них нестандартный TLS-сертификат)
      // Это необходимо для работы в Vercel/production
      rejectUnauthorized: false,
    };

    const req = https.request(requestOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Данные для авторизации GigaChat API
const GIGACHAT_AUTH = process.env.GIGACHAT_AUTH || "MDE5YmI3NTEtNDBmMi03Nzk1LTgxMjctYjQ3YjJlOGNlNWNhOmY2YzVhMTZjLTZjZmYtNGJlZS1hOTYwLTQ3ODQxOThjNzkxOQ==";
const GIGACHAT_CLIENT_ID = "019bb751-40f2-7795-8127-b47b2e8ce5ca";
const GIGACHAT_SCOPE = "GIGACHAT_API_PERS";
// URL для GigaChat API (согласно документации)
const GIGACHAT_TOKEN_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const GIGACHAT_API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

// Кэш для токена доступа
let cachedToken: { token: string; expiresAt: number } | null = null;

const SYSTEM_INSTRUCTION = `Ты — Prompt Engineer элитного уровня. Твоя цель: превратить пользовательский запрос в мощную инструкцию по методу RTF (Role, Task, Format). Структура ответа:

**Role** (профессиональная роль).

**Task** (детальная задача).

**Context** (контекст и детали).

**Constraints** (ограничения).

**Output Format** (как должен выглядеть результат). 

Ответ выдавай строго на русском языке в формате Markdown внутри блока кода.`;

// Функция для получения access token от GigaChat
async function getGigaChatToken(): Promise<string> {
  // Проверяем кэш токена
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    // Токен еще действителен (с запасом в 1 минуту)
    return cachedToken.token;
  }

  try {
    // Генерируем RqUID в формате UUID (как в документации)
    function generateUUID(): string {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const rqUID = generateUUID();
    
    // Формируем body в формате form-data (как в документации Python)
    const formData = new URLSearchParams();
    formData.append('scope', GIGACHAT_SCOPE);
    
    // Используем https модуль напрямую для обхода проблем с SSL
    const responseBody = await httpsRequest(
      GIGACHAT_TOKEN_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "RqUID": rqUID,
          "Authorization": `Basic ${GIGACHAT_AUTH}`,
        },
      },
      formData.toString()
    );
    
    const data: GigaChatTokenResponse = JSON.parse(responseBody);
    
    if (!data.access_token) {
      throw new Error("Токен доступа не получен в ответе");
    }
    
    // Сохраняем токен в кэш (токен действует 30 минут)
    cachedToken = {
      token: data.access_token,
      expiresAt: data.expires_at ? data.expires_at * 1000 : Date.now() + 1800000, // 30 минут
    };

    return data.access_token;

  } catch (error: any) {
    console.error("Ошибка получения токена GigaChat:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    
    // Более детальное сообщение об ошибке
    if (error.message?.includes("fetch failed") || error.cause?.code === "ECONNREFUSED" || error.cause?.code === "ENOTFOUND") {
      throw new Error(
        "Не удалось подключиться к серверу GigaChat. Возможные причины:\n" +
        "1. Проблемы с SSL сертификатом (требуется корневой сертификат НУЦ Минцифры)\n" +
        "2. Проблемы с сетью или файрволом\n" +
        "3. Неверный URL API\n\n" +
        `Детали ошибки: ${error.message}`
      );
    }
    
    if (error.message?.includes("certificate") || error.message?.includes("SSL") || error.message?.includes("TLS")) {
      throw new Error(
        "Ошибка SSL сертификата. Для работы с GigaChat API требуется установить корневой сертификат НУЦ Минцифры. " +
        "Подробнее: https://developers.sber.ru/docs/ru/gigachat/installation"
      );
    }
    
    throw new Error(`Не удалось получить токен доступа: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Промпт не может быть пустым" },
        { status: 400 }
      );
    }

    // Получаем токен доступа
    const accessToken = await getGigaChatToken();

    // Формируем запрос к GigaChat API
    const payload = {
      model: "GigaChat",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    // Используем https модуль для основного запроса тоже
    try {
      const apiResponseBody = await httpsRequest(
        GIGACHAT_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
          },
        },
        JSON.stringify(payload)
      );

      const data: GigaChatResponse = JSON.parse(apiResponseBody);
      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new Error("Ответ от модели пустой. Попробуйте снова.");
      }

      return NextResponse.json({
        success: true,
        data: text,
      });
    } catch (apiError: any) {
      // Обработка ошибок API
      if (apiError.message?.includes("401") || apiError.message?.includes("Unauthorized")) {
        // Токен истек, очищаем кэш
        cachedToken = null;
        return NextResponse.json(
          {
            success: false,
            error: "Ошибка авторизации. Попробуйте еще раз.",
          },
          { status: 401 }
        );
      }
      throw apiError;
    }
  } catch (error: any) {
    console.error("Ошибка API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Произошла ошибка при генерации промпта",
      },
      { status: 500 }
    );
  }
}

