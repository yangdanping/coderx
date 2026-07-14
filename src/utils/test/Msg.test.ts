import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastSuccess, toastWarning, toastError, toastInfo } = vi.hoisted(() => ({
  toastSuccess: vi.fn(() => 'id-success'),
  toastWarning: vi.fn(() => 'id-warn'),
  toastError: vi.fn(() => 'id-fail'),
  toastInfo: vi.fn(() => 'id-info'),
}));

vi.mock('vue-sonner', () => ({
  toast: {
    success: toastSuccess,
    warning: toastWarning,
    error: toastError,
    info: toastInfo,
  },
}));

import Msg from '../Msg';

describe('Msg', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    toastWarning.mockClear();
    toastError.mockClear();
    toastInfo.mockClear();
  });

  it('maps showSuccess to toast.success with default duration', () => {
    Msg.showSuccess('ok');
    expect(toastSuccess).toHaveBeenCalledWith('ok', { duration: 1500 });
  });

  it('maps showWarn / showFail / showInfo to matching toast types', () => {
    Msg.showWarn('w');
    Msg.showFail('e');
    Msg.showInfo('i');
    expect(toastWarning).toHaveBeenCalledWith('w', { duration: 1500 });
    expect(toastError).toHaveBeenCalledWith('e', { duration: 1500 });
    expect(toastInfo).toHaveBeenCalledWith('i', { duration: 1500 });
  });

  it('forwards optional duration and closeButton', () => {
    Msg.showFail('err', { duration: 5000, closeButton: true });
    expect(toastError).toHaveBeenCalledWith('err', { duration: 5000, closeButton: true });
  });
});
