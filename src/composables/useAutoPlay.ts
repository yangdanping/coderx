import { readonly, ref, onBeforeUnmount } from 'vue';

export interface AutoPlayContext {
  sleep: (ms: number) => Promise<boolean>;
  isStopped: () => boolean;
}

export interface UseAutoPlayOptions {
  loopDelay?: number;
}

export function useAutoPlay(options: UseAutoPlayOptions = {}) {
  const { loopDelay = 3000 } = options;

  const isActive = ref(false);
  let runToken = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const clearTimers = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  };

  const sleep = (ms: number, token: number) =>
    new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        resolve(isActive.value && runToken === token);
      }, ms);

      timers.add(timer);
    });

  const stop = () => {
    isActive.value = false;
    runToken += 1;
    clearTimers();
  };

  const start = async (play: (context: AutoPlayContext) => Promise<void> | void) => {
    stop();

    isActive.value = true;
    runToken += 1;
    const token = runToken;

    while (isActive.value && runToken === token) {
      await play({
        sleep: (ms) => sleep(ms, token),
        isStopped: () => !isActive.value || runToken !== token,
      });

      if (!isActive.value || runToken !== token) {
        break;
      }

      const shouldContinue = await sleep(loopDelay, token);
      if (!shouldContinue) {
        break;
      }
    }
  };

  onBeforeUnmount(() => {
    stop();
  });

  return {
    isActive: readonly(isActive),
    start,
    stop,
  };
}
