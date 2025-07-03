import { io } from 'socket.io-client';
import { SOCKET_URL } from '@/global/request/config';
import { LocalCache, SessionCache } from '@/utils';
import useUserStore from '@/stores/user';
import type { DisconnectDescription, Socket } from 'socket.io-client/build/esm/socket';
export default function useSocket(state?: any) {
  const userStore = useUserStore();
  const socket = io(SOCKET_URL, {
    query: {
      userName: LocalCache.getCache('userInfo')?.name ?? '',
      userId: LocalCache.getCache('socketUser')?.id ?? '',
    },
  })
    // 监听io的online事件----------------------------------
    .on('online', ({ userList }) => {
      userStore.updateOnlineUsers(userList);
    })
    // 监听targetSocket的receive事件----------------------------------
    .on('receive', (data) => {
      console.log('客户端receive监听事件收到服务端data', data);
      appendMsg(state, data);
    })
    .on('disconnect', (reason: Socket.DisconnectReason, details?: DisconnectDescription) => {
      if (details) {
        console.log('socket disconnect reason', reason, ',details', details);
      }
    })
    .on('error', (err) => console.log('socket error', err));

  return socket;
}

export const appendMsg = (state: any, data: any) => {
  // 由于有多个聊天室的情况,所以要判断userName
  !state.msgBox[state.userName] && (state.msgBox[state.userName] = []);
  state.msgBox[state.userName].push(data);
};
