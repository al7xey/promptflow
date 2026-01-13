export interface GeneratedPrompt {
  role?: string;
  task?: string;
  context?: string;
  constraints?: string;
  outputFormat?: string;
  fullText?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export interface GigaChatTokenResponse {
  access_token: string;
  expires_at: number;
  token_type: string;
}

export interface GigaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GigaChatChoice {
  index: number;
  message: GigaChatMessage;
  finish_reason?: string;
}

export interface GigaChatResponse {
  choices: GigaChatChoice[];
  created: number;
  model: string;
  object: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

