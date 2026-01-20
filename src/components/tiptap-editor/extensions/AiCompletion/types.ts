/**
 * AI 编辑补全功能类型定义
 */

// 补全建议项
export interface CompletionSuggestion {
  id: string // A, B, C...
  text: string // 补全文本
  type: 'word' | 'phrase' | 'sentence' // 补全类型
}

// 补全 API 请求参数
export interface CompletionRequest {
  beforeText: string // 光标前文本
  afterText?: string // 光标后文本
  model?: string // 模型名称
  maxSuggestions?: number // 建议数量
}

// 补全 API 响应
export interface CompletionResponse {
  success: boolean
  suggestions: CompletionSuggestion[]
  message?: string
  timestamp: string
}

// 补全状态
export type CompletionState = 'idle' | 'loading' | 'showing' | 'error'

// 补全弹出框位置
export interface PopoverPosition {
  top: number
  left: number
}

// Extension 配置选项
export interface AiCompletionOptions {
  debounceMs: number // 防抖时间（毫秒）
  minTriggerLength: number // 最小触发字数
  contextWindow: number // 上下文窗口大小
  maxSuggestions: number // 最大建议数
  model?: string // 指定模型
}
