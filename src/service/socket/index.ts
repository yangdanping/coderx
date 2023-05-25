import { io } from 'socket.io-client';
import { SOCKET_URL } from '@/global/request/config';
export function useSocket(state?: any) {
  const socket = io(SOCKET_URL, {
    query: {
      userName: state.userName
    }
  })
    // 监听io的online事件----------------------------------
    .on('online', ({ userList }) => {
      state.userList = userList;
      // 把当前用户置顶
      (state.userList as any[]).find((user, index) => {
        if (user.userName === state.userName) {
          return state.userList.unshift(state.userList.splice(index, 1)[0]);
        }
      });
      console.log('前端拿到了进入聊天室的用户列表', state.userList);
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
