/**
 * Socket.IO 版本的在线状态服务
 * 特点：自动重连、跨浏览器兼容、简单易用
 */
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/global/request/config';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user.store';

class OnlineStatusService {
  private socket: Socket | null = null;

  /**
   * 连接到 Socket.IO 服务器
   * 支持两种模式：
   * 1. 已登录：作为在线用户连接，会显示在列表中
   * 2. 未登录：作为观察者连接，只接收列表不显示在列表中
   */
  connect() {
    // 如果已经连接，不重复连接
    if (this.socket?.connected) {
      console.log('Socket.IO 已连接，无需重复连接');
      return;
    }

    const token = LocalCache.getCache('token');
    const userInfo = LocalCache.getCache('userInfo');

    // 调试：打印用户信息
    console.log('调试信息：');
    console.log('  - token:', token ? '存在' : '不存在');
    console.log('  - userInfo:', userInfo);
    console.log('  - SOCKET_URL:', SOCKET_URL);

    // 判断是否为游客模式（使用 token 作为判断依据）
    const isGuest = !token;

    if (isGuest) {
      console.log('正在以"观察者"模式连接 Socket.IO 服务器...');
      console.log('连接参数：游客模式（只接收在线列表，不显示在列表中）');
    } else {
      console.log('正在以"在线用户"模式连接 Socket.IO 服务器...');
      console.log('连接参数：', {
        userName: userInfo.name,
        userId: userInfo.id,
        avatarUrl: userInfo.avatarUrl,
      });
    }

    // 🟢【新增逻辑】自动适配跨设备访问
    // 如果配置的是 localhost，但当前是通过 IP 访问的，则自动替换为当前 IP
    // 这样在笔记本访问 http://192.168.3.96 时，会自动去连 192.168.3.96:8001
    let connectionUrl = SOCKET_URL;
    if (SOCKET_URL.includes('localhost') && window.location.hostname !== 'localhost') {
      connectionUrl = SOCKET_URL.replace('localhost', window.location.hostname);
      console.log(`🔄 检测到跨设备访问，自动修正 Socket 地址为: ${connectionUrl}`);
    }

    // 创建 Socket.IO 连接(连接时已传递身份信息,后端通过io.on('connection')的回调,拿到socket.handshake.query,再解构拿到这些信息)
    this.socket = io(connectionUrl, {
      query: {
        userName: isGuest ? '' : userInfo.name, // 游客不传用户名
        userId: isGuest ? '' : userInfo.id, // 游客不传用户 ID
        avatarUrl: isGuest ? '' : userInfo.avatarUrl || '', // 游客不传头像
        isGuest: isGuest ? 'true' : 'false', // 标识是否为游客
      },
      // 自动重连配置
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // 监听连接成功事件
    this.socket.on('connect', () => {
      console.log('Socket.IO 连接成功！socketId:', this.socket?.id);
    });

    // 监听在线用户列表更新事件
    // 服务器会在用户上线/下线时广播最新的在线用户列表
    this.socket.on('online', ({ userList }) => {
      console.log('收到在线用户列表:', userList);
      const userStore = useUserStore();
      userStore.updateOnlineUsers(userList);
    });

    // 监听断开连接事件
    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO 断开连接，原因:', reason);
    });

    // 监听连接错误
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error.message);
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      console.log('正在断开 Socket.IO 连接...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new OnlineStatusService();
