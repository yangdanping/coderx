import { toast } from 'vue-sonner';

const DEFAULT_DURATION = 1500;

export type MsgOptions = {
  duration?: number;
  closeButton?: boolean;
};

function resolveOptions(options?: MsgOptions) {
  return {
    duration: options?.duration ?? DEFAULT_DURATION,
    ...(options?.closeButton !== undefined ? { closeButton: options.closeButton } : {}),
  };
}

class Msg {
  static showSuccess(message: string, options?: MsgOptions) {
    return toast.success(message, resolveOptions(options));
  }
  static showWarn(message: string, options?: MsgOptions) {
    return toast.warning(message, resolveOptions(options));
  }
  static showFail(message: string, options?: MsgOptions) {
    return toast.error(message, resolveOptions(options));
  }
  static showInfo(message: string, options?: MsgOptions) {
    return toast.info(message, resolveOptions(options));
  }
}

export default Msg;
