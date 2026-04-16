/** 与编辑器 CompletionSuggestion 区分，仅供首页演示 JSON 结构 */
export interface AiCompletionDemoSuggestion {
  text: string;
}

export interface AiCompletionDemoData {
  initialText: string;
  typingText: string;
  loadingDelay: number;
  highlightDelay: number;
  loopDelay: number;
  suggestions: AiCompletionDemoSuggestion[];
  selectedIndex: number;
}
