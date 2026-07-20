import { watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import { getOAuthStatus, loginWithGoogleIdToken } from '@/service/oauth/oauth.request';
import { Msg } from '@/utils';
import type { GoogleCredentialResponse } from '@/types/google-gis';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const SKIP_ROUTES = new Set(['oauth-callback']);

let gisScriptPromise: Promise<void> | null = null;
let oneTapInitialized = false;
let oneTapInFlight = false;

function loadGisScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gisScriptPromise) {
    return gisScriptPromise;
  }

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Identity Services 加载失败')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisScriptPromise = null;
      reject(new Error('Google Identity Services 加载失败'));
    };
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

function cancelOneTap() {
  try {
    window.google?.accounts?.id?.cancel();
  } catch {
    // GIS 未就绪时忽略
  }
}

/**
 * 访客态下弹出 Google One Tap；登录成功后写入现有 JWT 会话。
 * 现有「使用 Google 登录」跳转流程仍保留作兜底。
 */
export function useGoogleOneTap() {
  const route = useRoute();
  const rootStore = useRootStore();
  const userStore = useUserStore();
  const { authStatus } = storeToRefs(rootStore);

  const handleCredential = async (response: GoogleCredentialResponse) => {
    const credential = response.credential;
    if (!credential || oneTapInFlight) return;

    oneTapInFlight = true;
    try {
      const res = await loginWithGoogleIdToken(credential);
      if (res.code !== 0 || !res.data?.token || !res.data?.id) {
        Msg.showFail(res.msg || 'Google 登录失败');
        return;
      }

      cancelOneTap();
      await userStore.loginWithOAuthTokenAction({
        token: res.data.token,
        userId: res.data.id,
      });
    } catch (error) {
      console.warn('[Google One Tap] 登录失败', error);
    } finally {
      oneTapInFlight = false;
    }
  };

  const promptOneTap = async () => {
    if (authStatus.value !== 'guest') return;
    if (SKIP_ROUTES.has(String(route.name ?? ''))) return;

    try {
      const statusRes = await getOAuthStatus();
      const clientId = statusRes.data?.googleClientId;
      if (statusRes.code !== 0 || !statusRes.data?.google || !clientId) {
        return;
      }

      await loadGisScript();
      const accountsId = window.google?.accounts?.id;
      if (!accountsId) return;

      if (!oneTapInitialized) {
        accountsId.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: true,
          cancel_on_tap_outside: false,
          context: 'signin',
          use_fedcm_for_prompt: true,
        });
        oneTapInitialized = true;
      }

      accountsId.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.info('[Google One Tap] 未展示:', notification.getNotDisplayedReason());
        } else if (notification.isSkippedMoment()) {
          console.info('[Google One Tap] 已跳过:', notification.getSkippedReason());
        }
      });
    } catch (error) {
      console.warn('[Google One Tap] 初始化失败', error);
    }
  };

  const stopWatch = watch(
    [authStatus, () => route.name],
    ([status, routeName]) => {
      if (status === 'authenticated' || SKIP_ROUTES.has(String(routeName ?? ''))) {
        cancelOneTap();
        return;
      }
      if (status === 'guest') {
        void promptOneTap();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    stopWatch();
    cancelOneTap();
  });
}
