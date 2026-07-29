export const NICKNAME_MAX_LENGTH = 30;
export const INVALID_NICKNAME_MESSAGE = '昵称须为 1-30 个字符，且不能包含换行或控制字符';

interface UserIdentity {
  name?: string | null;
  nickname?: string | null;
}

function hasForbiddenNicknameCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || codePoint === 0x2028 || codePoint === 0x2029;
  });
}

export function normalizeNickname(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateNickname(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return INVALID_NICKNAME_MESSAGE;

  const normalized = normalizeNickname(value);
  if (!normalized) return null;

  if (Array.from(normalized).length > NICKNAME_MAX_LENGTH || hasForbiddenNicknameCharacter(normalized)) {
    return INVALID_NICKNAME_MESSAGE;
  }

  return null;
}

export function getDisplayName(info: UserIdentity): string {
  return normalizeNickname(info.nickname) || normalizeNickname(info.name) || '用户';
}
