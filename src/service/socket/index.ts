import { io } from 'socket.io-client';
import { SOCKET_URL } from '@/global/request/config';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user';
export default function useSocket(state?: any) {
  const userStore = useUserStore();
  const socket = io(SOCKET_URL, {
    query: {
      userName: LocalCache.getCache('userInfo')?.name ?? ''
      // userName: userStore.userInfo?.name ?? ''
    }
  })
    // 监听io的online事件----------------------------------
    .on('online', ({ userList }) => {
      console.log('userStore', userStore.updateOnlineUsers(userList));
    })
    // 监听targetSocket的receive事件----------------------------------
    .on('receive', (data) => {
      console.log('客户端receive监听事件收到服务端data', data);
      appendMsg(state, data);
    })
    .on('error', (err) => console.log(err));

  return socket;
}

export const appendMsg = (state: any, data: any) => {
  // 由于有多个聊天室的情况,所以要判断userName
  !state.msgBox[state.userName] && (state.msgBox[state.userName] = []);
  state.msgBox[state.userName].push(data);
};
