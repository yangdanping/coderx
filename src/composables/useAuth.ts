import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import useUserStore from '@/stores/user.store';

/**
 * 认证相关的 Composable
 * 提供统一的用户身份验证逻辑
 *
 * @example
 * ```ts
 * const { isCurrentUser } = useAuth()
 *
 * // 在 script 中直接判断
 * if (isCurrentUser(userId)) {
 *   console.log('是当前用户')
 * }
 *
 * // 在模板中使用（推荐用 computed 包装）
 * const isMe = computed(() => isCurrentUser(props.profile.id))
 * // 模板中：v-if="isMe"
 * ```
 */
export function useAuth() {
  const userStore = useUserStore();
  const { token, userInfo } = storeToRefs(userStore);

  /**
   * 判断指定用户 ID 是否为当前已登录用户
   *
   * @param userId - 目标用户 ID
   * @returns 如果是当前登录用户返回 true，否则返回 false
   *
   * @remarks
   * - 需要用户已登录（token 存在）
   * - 通过对比 userId 与当前登录用户的 ID 来判断
   * - 支持 number 和 string 类型的用户 ID
   *
   * @example
   * ```ts
   * // 在组件中使用
   * const { isCurrentUser } = useAuth()
   * const isMe = computed(() => isCurrentUser(props.profile.id))
   * ```
   */
  const isCurrentUser = (userId: number | string | undefined) => {
    // 未登录或 userId 不存在，返回 false
    if (!token.value || !userId) return false;
    // 对比用户 ID（支持数字和字符串类型）
    return String(userId) === String(userInfo.value.id);
  };

  return {
    /** 判断是否为当前登录用户 */
    isCurrentUser,
  };
}
