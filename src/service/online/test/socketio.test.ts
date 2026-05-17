import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ioMock, socketOn, getCache, applyOnlineUserList, applyIncomingNotification, refreshAction, socketUrlRef } = vi.hoisted(() => ({
  ioMock: vi.fn(),
  socketOn: vi.fn(),
  getCache: vi.fn(),
  applyOnlineUserList: vi.fn(),
  applyIncomingNotification: vi.fn(),
  refreshAction: vi.fn(),
  socketUrlRef: {
    value: 'http://localhost:8001' as string | undefined,
  },
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

vi.mock('@/global/request/config', () => ({
  get SOCKET_URL() {
    return socketUrlRef.value;
  },
}));

vi.mock('@/utils', () => ({
  LocalCache: {
    getCache,
  },
}));

vi.mock('@/stores/online.store', () => ({
  default: () => ({
    applyOnlineUserList,
  }),
}));

vi.mock('@/stores/notification.store', () => ({
  default: () => ({
    applyIncomingNotification,
    refreshAction,
  }),
}));

import onlineStatusService from '../socketio';

describe('OnlineStatusService notifications', () => {
  const handlers: Record<string, (...args: any[]) => void> = {};

  beforeEach(() => {
    onlineStatusService.disconnect();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    ioMock.mockReset();
    socketOn.mockReset();
    getCache.mockReset();
    applyOnlineUserList.mockReset();
    applyIncomingNotification.mockReset();
    refreshAction.mockReset();
    socketUrlRef.value = 'http://localhost:8001';

    socketOn.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handler;
      return socket;
    });

    ioMock.mockReturnValue(socket);
    getCache.mockImplementation((key: string) => {
      if (key === 'token') return 'token-a';
      if (key === 'userInfo') return { id: 1, name: 'Coder' };
      return null;
    });
  });

  const socket = {
    connected: false,
    id: 'socket-1',
    on: socketOn,
    disconnect: vi.fn(),
  };

  it('refreshes notifications from REST after a logged-in socket connects', async () => {
    onlineStatusService.connect();

    handlers.connect();

    await vi.waitFor(() => {
      expect(refreshAction).toHaveBeenCalledWith(true);
    });
  });

  it('skips socket connection when VITE_SOCKET_URL is missing', () => {
    socketUrlRef.value = undefined;

    onlineStatusService.connect();

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('applies notification:new payloads to the notification store', async () => {
    const notification = { id: 8, recipientId: 1, actorId: 2, type: 'article_like' };

    onlineStatusService.connect();
    handlers['notification:new'](notification);

    await vi.waitFor(() => {
      expect(applyIncomingNotification).toHaveBeenCalledWith(notification);
    });
  });
});
