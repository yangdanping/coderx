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

/**
 * 触发模式
 * - 'punctuation': 标点/空格后触发（默认，减少干扰）
 * - 'idle': 停止输入后触发（更自然的补全体验）
 */
export type TriggerMode = 'punctuation' | 'idle'

// Extension 配置选项
export interface AiCompletionOptions {
  debounceMs: number // 防抖时间（毫秒）
  minTriggerLength: number // 最小触发字数
  contextWindow: number // 上下文窗口大小
  maxSuggestions: number // 最大建议数
  model?: string // 指定模型
  triggerMode?: TriggerMode // 触发模式，默认 'punctuation'
}
