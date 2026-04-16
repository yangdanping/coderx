export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatDemoData {
  typingSpeed: number;
  streamSpeed: number;
  thinkingDelay: number;
  loopDelay: number;
  conversation: ChatMessage[];
}
