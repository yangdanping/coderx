<template>
  <div class="ai-assistant" :class="{ 'is-open': isOpen }">
    <!-- 悬浮按钮 -->
    <div class="ai-trigger" @click="toggleOpen">
      <el-icon v-if="!isOpen"><ChatDotRound /></el-icon>
      <!-- <el-icon v-if="!isOpen"><span class="trigger-text">chat</span></el-icon> -->
      <el-icon v-else><Close /></el-icon>
      <span v-if="!isOpen" class="trigger-text">AI 助手</span>
    </div>

    <!-- 聊天窗口 -->
    <div class="chat-window" v-show="isOpen">
      <div class="chat-header">
        <div class="header-left">
          <h3>CoderX AI 助手</h3>
          <div class="model-selector" style="display: flex; align-items: center; gap: 5px; margin-top: 4px">
            <span class="model-label" style="font-size: 12px; color: #909399">Model:</span>
            <el-select v-model="activeModel" size="small" value-key="value" style="width: 110px" placeholder="选择模型">
              <el-option v-for="model in models" :key="model.value" :label="model.name" :value="model" />
            </el-select>
          </div>
        </div>
        <div class="status-indicator">
          <el-tooltip :content="aiServiceStatus === 'online' ? 'AI 服务在线' : aiServiceStatus === 'checking' ? '检查中...' : 'AI 服务离线'" placement="left">
            <span class="status-dot" :class="aiServiceStatus"></span>
          </el-tooltip>
        </div>
      </div>

      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="welcome-message">
          <p>你好！我是你的 AI 编程助手。</p>
          <p>你可以问我关于这篇文章的问题，或者让我解释代码。</p>
        </div>

        <div v-for="(m, index) in messages" :key="m.id || index" class="message" :class="m.role" v-show="getMessageText(m) || (m.role === 'assistant' && !isThinking)">
          <div class="avatar">
            <el-avatar :size="30" :icon="m.role === 'user' ? UserFilled : Service" :src="m.role === 'user' ? userInfo.avatarUrl : ''" />
          </div>
          <div class="content">
            <!-- V2 中 message.parts 是数组，需要找到 type="text" 的 part -->
            <div class="bubble" v-html="renderMarkdown(getMessageText(m))"></div>
          </div>
        </div>

        <div v-if="isThinking" class="message assistant">
          <div class="avatar"><el-avatar :size="30" :icon="Service" /></div>
          <div class="content"><div class="bubble loading">Thinking...</div></div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="input-area">
        <el-input v-model="input" placeholder="输入问题..." :disabled="isLoading || aiServiceStatus !== 'online'" @keydown.enter.prevent="onEnter">
          <template #append>
            <el-button :loading="isLoading" :disabled="aiServiceStatus !== 'online'" @click="handleSubmit">发送</el-button>
          </template>
        </el-input>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed, onMounted } from 'vue';
import { Chat } from '@ai-sdk/vue'; // 使用新的 Chat 类
import { DefaultChatTransport } from 'ai'; // 引入 DefaultChatTransport
import { ChatDotRound, Close, UserFilled, Service } from '@element-plus/icons-vue';
import useUserStore from '@/stores/user.store';
import { storeToRefs } from 'pinia';
import MarkdownIt from 'markdown-it';
import { BASE_URL } from '@/global/request/config';
import { ElMessage } from 'element-plus';
import { LocalCache } from '@/utils';

const props = defineProps<{
  context?: string; // 可选：传入文章内容作为上下文
}>();

const isOpen = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const { userInfo, token } = storeToRefs(useUserStore());
const input = ref('');
const aiServiceStatus = ref<'online' | 'offline' | 'checking'>('checking');

// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const renderMarkdown = (text: string) => {
  return md.render(text);
};

// 从消息中提取文本内容
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
    // 如果最后一条是助手消息且内容为空，说明还在等待首字生成
    if (lastMessage?.role === 'assistant' && !content) {
      return true;
    }
  }
  return false;
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

const onEnter = (e: KeyboardEvent | any) => {
  if (!e.shiftKey) {
    handleSubmit();
  }
};

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

// 组件挂载时检查服务状态
onMounted(() => {
  checkAIServiceStatus();
});
</script>

<style lang="scss" scoped>
$shadowColor: #a3dfd0;
.ai-assistant {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .ai-trigger {
    width: auto;
    min-width: 50px;
    height: 40px;
    padding: 0 15px;
    border-radius: 25px;
    background-color: #fff;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    box-shadow:
      0 0 0 2px $shadowColor,
      0 0 8px 2px rgba($shadowColor, 0.6),
      0 0 16px 4px rgba($shadowColor, 0.3),
      0 0 24px 6px rgba($shadowColor, 0.1);

    &:hover {
      transform: scale(1.1);
      box-shadow:
        0 0 0 2px $shadowColor,
        0 0 8px 8px rgba($shadowColor, 0.6),
        0 0 16px 16px rgba($shadowColor, 0.3),
        0 0 24px 32px rgba($shadowColor, 0.1);
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
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #eee;

    .chat-header {
      padding: 15px;
      background: var(--el-color-primary-light-9);
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        h3 {
          margin: 0;
          font-size: 16px;
          color: var(--el-color-primary);
        }

        .model-info {
          font-size: 12px;
          color: #909399;
        }
      }

      .status-indicator {
        .status-dot {
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
      padding: 15px;
      background-color: #f9f9f9;

      .welcome-message {
        text-align: center;
        color: #909399;
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
              &:last-child {
                margin-bottom: 0;
              }
            }
            :deep(pre) {
              background: #2d2d2d;
              color: #ccc;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
            }
            :deep(code) {
              background: rgba(0, 0, 0, 0.05);
              padding: 2px 4px;
              border-radius: 3px;
              font-family: monospace;
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
            border: 1px solid #e4e7ed;
            border-top-left-radius: 2px;
          }
        }
      }
    }

    .input-area {
      padding: 10px;
      border-top: 1px solid #eee;
      background: white;
    }
  }
}
</style>
