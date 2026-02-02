/**
 * AI 补全 API 封装
 */
import { BASE_URL } from '@/global/request/config';
import type { CompletionRequest, CompletionResponse, CompletionSuggestion } from './types';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 5000;

/**
 * 请求 AI 补全建议
 * @param params 请求参数
 * @param externalSignal 外部传入的 AbortSignal，用于竞态取消
 */
export async function fetchCompletion(
  params: CompletionRequest,
  externalSignal?: AbortSignal,
): Promise<CompletionSuggestion[]> {
  // 创建超时控制器
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT);

  // 组合信号：外部取消 或 超时取消
  // 使用 AbortSignal.any 组合多个信号（如果浏览器支持）
  // 否则手动监听外部信号
  let combinedSignal: AbortSignal;

  if (externalSignal && typeof AbortSignal.any === 'function') {
    // 现代浏览器：使用 AbortSignal.any 组合信号
    combinedSignal = AbortSignal.any([externalSignal, timeoutController.signal]);
  } else if (externalSignal) {
    // 兼容模式：监听外部信号，触发时取消超时控制器
    externalSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
    combinedSignal = timeoutController.signal;
  } else {
    // 无外部信号：仅使用超时控制
    combinedSignal = timeoutController.signal;
  }

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
      signal: combinedSignal,
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
      // 区分是外部取消还是超时
      if (externalSignal?.aborted) {
        console.log('[AI Completion] 请求被取消（竞态）');
      } else {
        console.warn('[AI Completion] 请求超时');
      }
    } else {
      console.error('[AI Completion] 请求失败:', error.message);
    }

    return [];
  }
}
