/**
 * 原生 WebSocket 版本的在线状态服务
 * 特点：原生 API、无依赖、需要手动处理重连
 */
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user.store';

// 从环境变量获取 WebSocket 地址（需要将 http 转为 ws）
const getWsUrl = () => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
  // 将 http:// 替换为 ws://，https:// 替换为 wss://
  return socketUrl.replace(/^http/, 'ws') + '/online';
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * 连接到 WebSocket 服务器
   * 支持两种模式：
   * 1. 已登录：作为在线用户连接，会显示在列表中
   * 2. 未登录：作为观察者连接，只接收列表不显示在列表中
   */
  connect() {
    // 如果已经连接，不重复连接
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已连接，无需重复连接');
      return;
    }

    const token = LocalCache.getCache('token');
    const userInfo = LocalCache.getCache('userInfo');

    // 判断是否为游客模式（使用 token 作为判断依据）
    const isGuest = !token;

    // 构建带用户信息的 WebSocket URL
    const wsUrl = getWsUrl();

    let fullUrl;
    if (isGuest) {
      console.log('正在以"观察者"模式连接 WebSocket 服务器...');
      fullUrl = `${wsUrl}?userName=&userId=&avatarUrl=&isGuest=true`;
    } else {
      console.log('正在以"在线用户"模式连接 WebSocket 服务器...');
      const userId = userInfo.id;
      const avatarUrl = userInfo.avatarUrl || '';
      fullUrl = `${wsUrl}?userName=${encodeURIComponent(userInfo.name)}&userId=${encodeURIComponent(userId)}&avatarUrl=${encodeURIComponent(avatarUrl)}&isGuest=false`;
    }

    this.ws = new WebSocket(fullUrl);

    // 监听连接成功事件
    this.ws.onopen = () => {
      console.log('WebSocket 连接成功！');
      this.reconnectAttempts = 0; // 重置重连次数
    };

    // 监听服务器消息
    // WebSocket 只能发送字符串，所以需要手动解析 JSON
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('收到消息:', data);

        // 处理不同类型的消息
        if (data.type === 'online') {
          // 在线用户列表更新
          const userStore = useUserStore();
          userStore.updateOnlineUsers(data.userList);
        }
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    };

    // 监听连接关闭
    this.ws.onclose = (event) => {
      console.log('WebSocket 连接关闭，代码:', event.code, '原因:', event.reason);
      this.ws = null;

      // 非正常关闭，尝试重连
      if (event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    // 监听连接错误
    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 断开连接
   */
  disconnect() {
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 关闭 WebSocket 连接
    if (this.ws) {
      console.log('正在断开 WebSocket 连接...');
      this.ws.close(1000, 'Client closed'); // 1000 表示正常关闭
      this.ws = null;
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 发送消息（示例方法，当前功能暂不需要）
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // WebSocket 只能发送字符串，需要手动序列化
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
    }
  }
}

// 导出单例
export default new WebSocketService();
