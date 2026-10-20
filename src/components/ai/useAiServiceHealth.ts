import { onMounted, onScopeDispose, readonly, shallowRef } from 'vue';
import { BASE_URL } from '@/global/request/config';

type AiModel = { name: string; value: string };

export function useAiServiceHealth(options: { token: () => string; savedModel: () => string | undefined }) {
  const status = shallowRef<'online' | 'offline' | 'checking'>('checking');
  const models = shallowRef<AiModel[]>([]);
  const activeModel = shallowRef<AiModel | null>(null);
  const capability = shallowRef<{ type: string; supportsTools: boolean } | null>(null);
  let request: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  async function check() {
    if (request || disposed) return;
    const controller = new AbortController();
    request = controller;
    status.value = 'checking';
    timer = setTimeout(() => controller.abort(), 5000);
    try {
      const token = options.token();
      const response = await fetch(`${BASE_URL}/ai/health`, {
        headers: token ? { Authorization: token } : {},
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('AI health check failed');
      const data = await response.json();
      if (disposed || controller.signal.aborted) return;
      models.value = Array.isArray(data.models)
        ? data.models.filter(
            (model: unknown): model is AiModel =>
              !!model && typeof model === 'object' && 'name' in model && typeof model.name === 'string' && 'value' in model && typeof model.value === 'string',
          )
        : [];
      capability.value = data.capability ?? null;
      const preferred = activeModel.value?.value ?? options.savedModel();
      activeModel.value = models.value.find((model) => model.value === preferred) ?? models.value[0] ?? null;
      status.value = data.status === 'online' ? 'online' : 'offline';
    } catch {
      if (!disposed) status.value = 'offline';
    } finally {
      // Also handle a response that completes after its timeout fired.
      if (!disposed && controller.signal.aborted) status.value = 'offline';
      clearTimeout(timer);
      request = null;
    }
  }

  onMounted(check);
  onScopeDispose(() => {
    disposed = true;
    clearTimeout(timer);
    request?.abort();
  });

  return { status: readonly(status), models: readonly(models), activeModel, capability: readonly(capability), check };
}
