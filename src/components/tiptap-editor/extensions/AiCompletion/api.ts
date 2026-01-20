/**
 * AI 补全 API 封装
 */
import { BASE_URL } from '@/global/request/config';
import type { CompletionRequest, CompletionResponse, CompletionSuggestion } from './types';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 5000;

/**
 * 请求 AI 补全建议
 */
export async function fetchCompletion(params: CompletionRequest): Promise<CompletionSuggestion[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${BASE_URL}/ai/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beforeText: params.beforeText,
        afterText: params.afterText || '',
        model: params.model,
        maxSuggestions: params.maxSuggestions || 3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CompletionResponse = await response.json();

    if (data.success && data.suggestions) {
      return data.suggestions;
    }

    return [];
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[AI Completion] 请求超时');
    } else {
      console.error('[AI Completion] 请求失败:', error.message);
    }

    return [];
  }
}
