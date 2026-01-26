<template>
  <div class="ai-assistant" :class="{ 'is-open': isOpen }">
    <!-- 悬浮按钮 -->
    <el-tooltip :content="`AI 助手 (${aiShortcutText})`" placement="left" :disabled="isOpen">
      <div class="ai-trigger" role="button" @click="toggleOpen">
        <el-icon v-if="!isOpen"><MessageCircle /></el-icon>
        <!-- <el-icon v-if="!isOpen"><span class="trigger-text">chat</span></el-icon> -->
        <el-icon v-else><X /></el-icon>
        <span v-if="!isOpen" class="trigger-text">AI助手</span>
      </div>
    </el-tooltip>

    <!-- 聊天窗口 -->
    <div class="chat-window" v-show="isOpen" :style="chatWindowStyle" ref="chatWindowRef">
      <!-- 调整大小的手柄 -->
      <div class="resize-handle resize-handle-left" @mousedown="startResize('left', $event)"></div>
      <div class="resize-handle resize-handle-top" @mousedown="startResize('top', $event)"></div>
      <div class="resize-handle resize-handle-corner" @mousedown="startResize('corner', $event)"></div>
      <div class="chat-header">
        <div class="header-left">
          <div class="header-title"><span>Coder</span><span class="x">X</span> <span>AI 助手</span></div>
        </div>
        <div class="header-right">
          <div class="model-selector">
            <span class="model-label">Model:</span>
            <el-select v-model="activeModel" size="small" value-key="value" style="width: 110px" placeholder="选择模型">
              <el-option v-for="model in models" :key="model.value" :label="model.name" :value="model" />
            </el-select>
          </div>
          <div class="status-indicator">
            <el-tooltip :content="aiServiceStatus === 'online' ? 'AI 服务在线' : aiServiceStatus === 'checking' ? '检查中...' : 'AI 服务离线'" placement="left">
              <span class="status-dot" :class="aiServiceStatus"></span>
            </el-tooltip>
          </div>
        </div>
      </div>
      <div class="messages-container" ref="messagesContainer" @scroll="handleScroll">
        <div v-if="messages.length === 0" class="welcome-message">
          <p>你好！我是你的 AI 助手。</p>
          <p>你可以问我关于这篇文章的问题，或者让我解释代码。</p>
        </div>

        <div v-for="(m, index) in displayMessages" :key="m.id || index" class="message" :class="m.role">
          <div class="avatar">
            <el-avatar :size="30" :icon="m.role === 'user' ? User : Bot" :src="m.role === 'user' ? userInfo.avatarUrl : ''" />
          </div>
          <div class="content">
            <!-- V2 中 message.parts 是数组，需要找到 type="text" 的 part -->
            <div class="bubble" v-html="renderMarkdown(getMessageText(m))"></div>
          </div>
        </div>

        <div v-if="isThinking" class="message assistant">
          <div class="avatar"><el-avatar :size="30" :icon="Bot" /></div>
          <div class="content">
            <div class="bubble loading">
              <!-- V1: 文字流光效果 -->
              <div v-if="loadingStyle === 'shimmer'" class="thinking-content">
                <ThinkingShimmer :width="100" :height="20" text="Thinking..." color="#909399" shimmerColor="#fff" />
              </div>

              <!-- V2: 动态波形效果 -->
              <div v-else class="thinking-content">
                <ThinkingWave :width="60" :height="20" color="#409eff" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 回到底部按钮 -->
      <div class="scroll-bottom-btn" role="button" v-show="showScrollToBottom" @click="scrollToBottomSmooth">
        <el-icon><ArrowDown /></el-icon>
      </div>

      <form @submit.prevent="handleSubmit" class="input-area">
        <div class="input-wrapper">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 6 }"
            placeholder="输入问题..."
            :disabled="isLoading || aiServiceStatus !== 'online'"
            @keydown.enter="onEnter"
            class="input-textarea"
          />
          <div class="button-container">
            <el-button v-if="isLoading" type="danger" plain size="small" @click="handleStop" class="action-button">停止</el-button>
            <el-button v-else type="primary" plain size="small" :disabled="!input.trim() || aiServiceStatus !== 'online'" @click="handleSubmit" class="action-button"
              >发送</el-button
            >
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed, onMounted, onUnmounted } from 'vue';
import { Chat } from '@ai-sdk/vue'; // 使用新的 Chat 类
import { DefaultChatTransport } from 'ai'; // 引入 DefaultChatTransport
import { MessageCircle, X, User, Bot, ArrowDown } from 'lucide-vue-next';
import useUserStore from '@/stores/user.store';
import { storeToRefs } from 'pinia';
import MarkdownIt from 'markdown-it';
import { BASE_URL } from '@/global/request/config';
import { ElMessage } from 'element-plus';
import { LocalCache, throttle, throttleByRaf, emitter, getAiShortcutText, isAiToggleShortcut } from '@/utils';
import ThinkingWave from '@/components/icon/cpns/ThinkingWave.vue';
import ThinkingShimmer from '@/components/icon/cpns/ThinkingShimmer.vue';

// AI 助手快捷键提示文本（根据系统自动适配）
const aiShortcutText = getAiShortcutText();
const props = defineProps<{
  context?: string; // 可选：传入文章内容作为上下文
}>();

const isOpen = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const chatWindowRef = ref<HTMLElement | null>(null);
const { userInfo, token } = storeToRefs(useUserStore());
const input = ref('');
const aiServiceStatus = ref<'online' | 'offline' | 'checking'>('checking');
const showScrollToBottom = ref(false);
// 切换 Loading 动画风格: 'wave' | 'shimmer'
const loadingStyle = ref<'wave' | 'shimmer'>('shimmer');

// ============ 可调整大小功能 ============
const MIN_WIDTH = 330;
const MAX_WIDTH = 600;
const MIN_HEIGHT = 400;
const MAX_HEIGHT = 700;
const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 500;

// 从 localStorage 读取保存的尺寸
const getSavedSize = () => {
  try {
    const saved = LocalCache.getCache('aiChatWindowSize');
    if (saved && saved.width && saved.height) {
      return {
        width: Math.min(Math.max(saved.width, MIN_WIDTH), MAX_WIDTH),
        height: Math.min(Math.max(saved.height, MIN_HEIGHT), MAX_HEIGHT),
      };
    }
  } catch (e) {
    console.warn('Failed to load saved chat window size');
  }
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
};

const savedSize = getSavedSize();
const chatWidth = ref(savedSize.width);
const chatHeight = ref(savedSize.height);
const isResizing = ref(false);
const resizeDirection = ref<'left' | 'top' | 'corner' | null>(null);
const startX = ref(0);
const startY = ref(0);
const startWidth = ref(0);
const startHeight = ref(0);

// 聊天窗口动态样式
const chatWindowStyle = computed(() => ({
  width: `${chatWidth.value}px`,
  height: `${chatHeight.value}px`,
}));

// 保存尺寸到 localStorage
const saveSize = () => {
  LocalCache.setCache('aiChatWindowSize', {
    width: chatWidth.value,
    height: chatHeight.value,
  });
};

// 开始调整大小
const startResize = (direction: 'left' | 'top' | 'corner', e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  resizeDirection.value = direction;
  startX.value = e.clientX;
  startY.value = e.clientY;
  startWidth.value = chatWidth.value;
  startHeight.value = chatHeight.value;

  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = direction === 'corner' ? 'nwse-resize' : direction === 'left' ? 'ew-resize' : 'ns-resize';
  document.body.style.userSelect = 'none';
};

// 处理调整大小
const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return;

  const deltaX = startX.value - e.clientX; // 左侧拖动，鼠标向左移动 deltaX 为正
  const deltaY = startY.value - e.clientY; // 顶部拖动，鼠标向上移动 deltaY 为正

  if (resizeDirection.value === 'left' || resizeDirection.value === 'corner') {
    const newWidth = startWidth.value + deltaX;
    chatWidth.value = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
  }

  if (resizeDirection.value === 'top' || resizeDirection.value === 'corner') {
    const newHeight = startHeight.value + deltaY;
    chatHeight.value = Math.min(Math.max(newHeight, MIN_HEIGHT), MAX_HEIGHT);
  }
};

// 停止调整大小
const stopResize = () => {
  if (isResizing.value) {
    isResizing.value = false;
    resizeDirection.value = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    saveSize();
  }
};

// 组件卸载时清理事件监听
// onUnmounted 处理移到了下方合并处理
/*
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
});
*/

// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const renderMarkdown = (text: string) => {
  return md.render(text);
};

// 从消息中提取文本内容,从后端返回给我的AI SDK v2 的消息格式中,提取真正要渲染的文本
const getMessageText = (message: any) => {
  // 如果有 content 字段，直接返回
  if (message.content) {
    return message.content;
  }

  // 如果有 parts 数组，查找 type="text" 的 part
  if (message.parts && Array.isArray(message.parts)) {
    // 合并所有文本类型的 part
    return message.parts
      .filter((part: any) => part.type === 'text' && part.text)
      .map((part: any) => part.text)
      .join('\n');
  }

  return '';
};

const models: any = ref([]);

const activeModel = ref<any>(null);

watch(activeModel, (newVal) => {
  if (newVal && token.value && userInfo.value) {
    (userInfo.value as any).selectModel = newVal.value;
    LocalCache.setCache('userInfo', userInfo.value);
  }
});

// 使用 Vercel AI SDK v2 Chat 类
// 必须使用 DefaultChatTransport 来配置 api 和 headers
const chat = new Chat({
  transport: new DefaultChatTransport({
    api: `${BASE_URL}/ai/chat`, // 走代理
    headers: () => {
      // 如果有 token 就传递，没有也可以正常使用（游客模式）
      const headers: Record<string, string> = {};
      if (token.value) {
        headers.Authorization = token.value;
      }
      return headers;
    },
    // 在每次请求时传递文章上下文
    body: () => ({
      context: props.context || null,
      model: activeModel.value?.value,
    }),
  }),
});

// 将 chat.messages 转换为响应式数据
// 注意：Chat 类的 messages getter 访问了内部的 ref，所以 computed 可以追踪
// 复习:computed回调什么时候执行? --> 仅会在其响应式依赖更新时才重新计算 或 读取到了该计算属性 且 当前计算属性是脏数据(缓存过时的数据,源码默认第一次就是脏数据) 时,其回调参会执行
const messages: any = computed(() => chat.messages);
const isLoading = computed(() => chat.status === 'streaming' || chat.status === 'submitted');
// "Thinking..." 显示逻辑优化：
// 1. 提交后但在连接前 (submitted)
// 2. 连接后但在收到第一个字符前 (streaming 且最后一条消息为空)
const isThinking = computed(() => {
  if (chat.status === 'submitted') return true;

  if (chat.status === 'streaming') {
    const lastMessage = messages.value[messages.value.length - 1];
    const content = getMessageText(lastMessage);
    console.log('正在流式接收并提取内容', content);
    // 如果最后一条是助手消息且内容为空，说明还在等待首字生成
    if (lastMessage?.role === 'assistant' && !content) {
      return true;
    }
  }
  return false;
});

// 过滤消息列表，替代 template 中的 v-if/v-show 逻辑
const displayMessages = computed(() => {
  return messages.value.filter((m: any) => {
    // 显示条件：有内容 OR (是助手消息 AND 不在思考中)
    return getMessageText(m) || (m.role === 'assistant' && !isThinking.value);
  });
});

watch(
  () => chat.status,
  (newVal) => {
    console.log('大语言模型状态', newVal);
  },
);

const handleSubmit = async () => {
  if (!input.value.trim() || isLoading.value) return;

  // 检查 AI 服务状态
  if (aiServiceStatus.value === 'offline') {
    ElMessage.error({
      message: 'AI 服务暂时不可用，请检查 Ollama 是否运行',
      duration: 3000,
    });
    return;
  }

  const userMessage = input.value;
  input.value = ''; // 立即清空输入框

  // 发送消息
  // 使用 Vercel AI SDK v2 的 sendMessage 方法
  try {
    await chat.sendMessage({
      text: userMessage,
    });
    // 发送成功，更新状态为在线
    aiServiceStatus.value = 'online';
  } catch (error: any) {
    console.error('Error sending message:', error);

    // 更新服务状态
    aiServiceStatus.value = 'offline';

    // 显示友好的错误提示
    let errorMsg = 'AI 服务暂时不可用';

    // 尝试解析错误响应
    if (error.response) {
      try {
        const errorData = await error.response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {
        // 解析失败，使用默认消息
      }
    } else if (error.message) {
      errorMsg = error.message;
    }

    ElMessage.error({
      message: errorMsg,
      duration: 5000,
      showClose: true,
    });

    // 恢复用户输入
    input.value = userMessage;
  }

  scrollToBottom();
};

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    scrollToBottom();
  }
};

const onEnter = (e: Event | KeyboardEvent) => {
  // 类型守卫：确保是 KeyboardEvent
  if (!(e instanceof KeyboardEvent)) return;

  // Shift+Enter 允许换行
  if (e.shiftKey) {
    return; // 允许默认行为（换行）
  }

  // 单独 Enter 发送消息
  e.preventDefault();
  handleSubmit();
};

const handleStop = () => {
  chat.stop();
};

const scrollToBottomSmooth = async () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth',
    });
  }
};

const handleScroll = throttleByRaf(() => {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  // 如果距离底部超过 100px，显示按钮
  showScrollToBottom.value = scrollHeight - scrollTop - clientHeight > 100;
});

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 监听消息长度变化自动滚动
watch(
  () => messages.value.length,
  () => {
    scrollToBottom();
  },
);

// 监听最后一条消息内容变化（流式输出时）
watch(
  () => messages.value[messages.value.length - 1]?.content,
  () => {
    scrollToBottom();
  },
);

// 检查 AI 服务状态
const checkAIServiceStatus = async () => {
  // 由于原生 fetch 不支持 timeout配置,所以使用 AbortController 配合 setTimeout 实现 5 秒超时控制
  // 1. 创建控制器
  const controller = new AbortController();
  // 2. 创建定时器,5秒后自动取消请求
  const timer = setTimeout(() => controller.abort(), 5000); // 5秒超时自动取消

  try {
    aiServiceStatus.value = 'checking';
    const headers: Record<string, string> = {};
    // 如果有 token 就传递（登录用户），没有也可以检查（游客）
    if (token.value) {
      headers.Authorization = token.value;
    }

    const res = await fetch(`${BASE_URL}/ai/health`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (res.ok) {
      // 解析响应体，检查实际的服务状态
      const data = await res.json();
      aiServiceStatus.value = data.status === 'online' ? 'online' : 'offline';
      models.value = data.models;

      if (models.value.length > 0) {
        let selected = models.value[0];
        if (token.value && userInfo.value) {
          const savedModelValue = (userInfo.value as any).selectModel;
          if (savedModelValue) {
            const saved = models.value.find((m: any) => m.value === savedModelValue);
            if (saved) selected = saved;
          }
        }
        activeModel.value = selected;
      }
    } else {
      aiServiceStatus.value = 'offline';
    }
  } catch (error) {
    aiServiceStatus.value = 'offline';
    console.warn('AI service health check failed:', error);
  } finally {
    clearTimeout(timer); // 放到这里，无论成功失败都会清除定时器
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  // Mac/Windows: Alt+A（Mac 上 Alt 即 Option 键）
  if (isAiToggleShortcut(e)) {
    e.preventDefault();
    toggleOpen();
  }
};

// 组件挂载时检查服务状态
onMounted(() => {
  checkAIServiceStatus();
  emitter.on('toggleAiAssistant', toggleOpen);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  emitter.off('toggleAiAssistant', toggleOpen);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style lang="scss" scoped>
@use 'sass:color';

$shadowColor: #a3dfd0;
.ai-assistant {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .ai-trigger {
    width: auto;
    min-width: 50px;
    height: 40px;
    padding: 0 15px;
    border-radius: 25px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    box-shadow:
      0 0 0 2px $shadowColor,
      0 0 8px 2px color.change($shadowColor, $alpha: 0.6),
      0 0 16px 4px color.change($shadowColor, $alpha: 0.1),
      0 0 24px 6px color.change($shadowColor, $alpha: 0.1);

    &:hover {
      transform: scale(1.1);
      box-shadow:
        0 0 0 2px $shadowColor,
        0 0 8px 8px color.change($shadowColor, $alpha: 0.6),
        0 0 16px 16px color.change($shadowColor, $alpha: 0.1),
        0 0 24px 32px color.change($shadowColor, $alpha: 0.1);
    }

    .trigger-text {
      margin-left: 5px;
      font-size: 14px;
      font-weight: bold;
      background: linear-gradient(to right, #00ffbb, #6ec2c4);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  &.is-open .ai-trigger {
    margin-bottom: 10px;
    width: 40px;
    height: 40px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .chat-window {
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @include thin-border(all, var(--el-border-color-lighter));
    position: relative; // 确保绝对定位的子元素相对于此定位

    :where(html.dark) & {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      @include thin-border(all, #333);
    }

    // 调整大小手柄 - 左侧
    .resize-handle-left {
      position: absolute;
      left: 0;
      top: 20px;
      bottom: 20px;
      width: 6px;
      cursor: ew-resize;
      z-index: 10;
      background: transparent;
      transition: background-color 0.2s;

      &:hover,
      &:active {
        background: linear-gradient(to right, rgba(var(--el-color-primary-rgb), 0.1), transparent);
      }
    }

    // 调整大小手柄 - 顶部
    .resize-handle-top {
      position: absolute;
      top: 0;
      left: 20px;
      right: 20px;
      height: 6px;
      cursor: ns-resize;
      z-index: 10;
      background: transparent;
      transition: background-color 0.2s;

      &:hover,
      &:active {
        background: linear-gradient(to bottom, rgba(var(--el-color-primary-rgb), 0.1), transparent);
      }
    }

    // 调整大小手柄 - 左上角
    .resize-handle-corner {
      position: absolute;
      left: 0;
      top: 0;
      width: 16px;
      height: 16px;
      cursor: nwse-resize;
      z-index: 11;
      background: transparent;
      border-radius: 12px 0 0 0;

      &::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 3px;
        width: 8px;
        height: 8px;
        border-left: 2px solid transparent;
        border-top: 2px solid transparent;
        transition: border-color 0.2s;
      }

      &:hover::before,
      &:active::before {
        border-left-color: var(--el-color-primary);
        border-top-color: var(--el-color-primary);
      }
    }

    .chat-header {
      padding: 6px 16px;
      background: linear-gradient(to right, rgba(103, 194, 58, 0.1), transparent);
      box-shadow: 0 1px 6px 0 rgba(100, 100, 100, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        font-size: 14px;
        font-weight: 700;

        .x {
          font-style: oblique;
          padding-right: 4px;
          background-image: var(--xfontStyle);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        :deep(.el-select__wrapper) {
          background-color: transparent;
          cursor: var(--pointerDefault);
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;

        .model-selector {
          display: flex;
          align-items: center;
          gap: 6px;

          .model-label {
            font-size: 12px;
            color: #606266;
          }
        }
      }

      .status-indicator {
        .status-dot {
          cursor: var(--pointerDefault);
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;

          &.online {
            background-color: #67c23a;
            box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
          }

          &.offline {
            background-color: #f56c6c;
            box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.2);
            animation: none;
          }

          &.checking {
            background-color: #e6a23c;
            box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
          }
        }
      }
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;

      .welcome-message {
        text-align: center;
        color: #a8a9ab;
        font-size: 14px;
        margin-top: 20px;
      }

      .message {
        display: flex;
        margin-bottom: 15px;

        .avatar {
          margin-right: 10px;
        }

        .content {
          max-width: 80%;

          .bubble {
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;

            // Markdown 样式微调
            :deep(p) {
              margin: 0 0 8px 0;
              line-height: 1.6;
              &:last-child {
                margin-bottom: 0;
              }
            }
            :deep(ul),
            :deep(ol) {
              margin: 0 0 8px 0;
              padding-left: 20px; /* 给列表增加左内边距，防止贴边 */
            }
            :deep(li) {
              margin-bottom: 4px;
              line-height: 1.6;
              /* list-style-position: outside; // 默认就是 outside，确保在 padding 区域显示圆点 */
            }
            :deep(h1),
            :deep(h2),
            :deep(h3),
            :deep(h4) {
              margin: 12px 0 8px 0;
              font-weight: 600;
              line-height: 1.4;
            }
            :deep(h1) {
              font-size: 1.4em;
            }
            :deep(h2) {
              font-size: 1.3em;
            }
            :deep(h3) {
              font-size: 1.2em;
            }
            :deep(h4) {
              font-size: 1.1em;
            }

            :deep(a) {
              color: var(--el-color-primary);
              text-decoration: none;
              &:hover {
                text-decoration: underline;
              }
            }
            :deep(blockquote) {
              margin: 8px 0;
              padding: 4px 10px;
              border-left: 3px solid #eee;
              color: #606266;
              background-color: #f2f3f5;
              border-radius: 0 4px 4px 0;
            }
            :deep(pre) {
              background: #2d2d2d;
              color: #e6e6e6;
              padding: 12px;
              border-radius: 6px;
              overflow-x: auto;
              margin: 8px 0;
              font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
              font-size: 13px;
              line-height: 1.5;
            }
            :deep(code) {
              /* 行内代码样式 */
              background-color: #f0f2f5;
              color: #c0392b;
              padding: 2px 5px;
              border-radius: 4px;
              font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
              font-size: 0.9em;
              margin: 0 2px;
            }
            :deep(pre code) {
              /* 代码块内的 code 标签复位 */
              background-color: transparent;
              color: inherit;
              padding: 0;
              margin: 0;
              border-radius: 0;
            }

            &.loading {
              position: relative;
              padding: 8px 12px;
              background: transparent;
              border: none;
              z-index: 0;
              overflow: hidden;
              border-radius: 10px;

              // 流光边框 - 旋转的渐变背景
              &::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 200%;
                height: 200%;
                background: conic-gradient(from 0deg, transparent 0deg 60deg, #00ffbb 90deg, #6ec2c4 120deg, #a3dfd0 150deg, transparent 180deg 360deg);
                transform: translate(-50%, -50%);
                animation: rotate-border 2s linear infinite;
                z-index: -2;
                border-radius: 10px;
              }

              // 内部遮罩 - 白色背景覆盖中心
              &::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                right: 2px;
                bottom: 2px;
                background: white;
                border-radius: 8px;
                z-index: -1;
              }

              .thinking-content {
                display: flex;
                align-items: center;
                color: #909399;
                font-size: 13px;
                position: relative;
                z-index: 1;
              }
            }

            @keyframes rotate-border {
              0% {
                transform: translate(-50%, -50%) rotate(0deg);
              }
              100% {
                transform: translate(-50%, -50%) rotate(360deg);
              }
            }
          }
        }

        &.user {
          flex-direction: row-reverse;

          .avatar {
            margin-right: 0;
            margin-left: 10px;
          }

          .bubble {
            background-color: var(--el-color-primary);
            color: white;
            border-top-right-radius: 2px;
          }
        }

        &.assistant {
          .bubble {
            background-color: white;
            color: #333;
            @include thin-border(all, #eee);
            border-top-left-radius: 2px;
          }
        }
      }
    }

    .input-area {
      // padding: 6px;
      // background: white;
      // border-top: 1px solid #f0f2f5;

      .input-wrapper {
        position: relative;
        // background: #f5f7fa;
        // border-radius: 0 0 8px 8px;
        border-top: 1px solid #eee;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;

        &:focus-within {
          border-color: var(--el-color-primary);
          box-shadow: 0 0 0 3px rgba(var(--el-color-primary-rgb), 0.1);
        }

        .input-textarea {
          width: 100%;

          :deep(.el-textarea__inner) {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 10px 12px 45px 12px; // 为底部按钮留出空间
            min-height: 44px;
            font-size: 14px;
            color: #303133;
            resize: none;

            &::placeholder {
              color: #a8abb2;
            }
          }
        }

        .button-container {
          position: absolute;
          right: 8px;
          bottom: 8px;
          display: flex;
          justify-content: flex-end;
          z-index: 2;

          .action-button {
            height: 28px;
            padding: 0 16px;
            font-weight: 500;
            transition: all 0.2s;
          }
        }
      }
    }

    .scroll-bottom-btn {
      position: absolute;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 30px;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--el-color-primary);
      z-index: var(--z-content);
      @include thin-border(all, #eee);

      &:hover {
        background-color: #f5f7fa;
      }
    }
  }
}
</style>
