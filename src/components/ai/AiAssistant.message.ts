type MessagePart = {
  type?: string;
  text?: string;
};

type MessageLike =
  | {
      parts?: MessagePart[] | null;
    }
  | null
  | undefined;

const isTextPart = (part: MessagePart): part is MessagePart & { type: 'text'; text: string } => {
  return part.type === 'text' && typeof part.text === 'string' && part.text.length > 0;
};

export const getAiAssistantMessageText = (message: MessageLike): string => {
  // console.log('getAiAssistantMessageText', toRaw(message));
  if (!Array.isArray(message?.parts)) return '';

  return message.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join('\n');
};
