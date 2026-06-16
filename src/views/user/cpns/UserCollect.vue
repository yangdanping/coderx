<template>
  <div class="user-collect">
    <div class="list-header">
      <div v-if="articles.result?.length">
        <h2>
          <button type="button" class="back" aria-label="返回收藏夹列表" @click="clearResultAndBack"><ChevronLeft aria-hidden="true" /></button>
          收藏夹"{{ activeCollect.name }}"下的文章({{ articles.result?.length }})
        </h2>
      </div>
      <div v-else>
        <h2>{{ sex }}的收藏({{ collects.length }})</h2>
      </div>
      <div class="btn">
        <template v-if="isMe && !showSetup">
          <el-tooltip effect="dark" :content="showNewInput ? '取消' : '新建收藏夹'" placement="right">
            <el-button circle :aria-label="showNewInput ? '取消新建收藏夹' : '新建收藏夹'" @click="toggleNewInput">
              <Plus class="create-toggle-icon" :class="{ 'is-active': showNewInput }" aria-hidden="true" />
            </el-button>
          </el-tooltip>
        </template>
        <template v-if="showSetup">
          <el-tooltip effect="dark" content="批量操作" placement="right">
            <el-button :aria-label="showCheckBox ? '退出批量操作' : '进入批量操作'" @click="handleCollect" :icon="Settings" circle></el-button>
          </el-tooltip>
        </template>
      </div>
    </div>
    <div class="list">
      <!-- 新建收藏夹 inline 输入 -->
      <div v-if="showNewInput" class="new-collect-input">
        <el-input
          ref="newInputRef"
          v-model="newCollectName"
          aria-label="新收藏夹名称"
          autocomplete="off"
          name="newCollectName"
          placeholder="输入收藏夹名称..."
          clearable
          @keyup.enter="createCollect"
          @keyup.escape="cancelCreate"
        >
          <template #append>
            <el-button @click="createCollect" :disabled="!newCollectName.trim()">确定</el-button>
          </template>
        </el-input>
      </div>
      <!-- 批量操作 -->
      <div v-if="showCheckBox">
        <ul class="setting">
          <li><input id="all" type="checkbox" @change="handleCheckboxAll" /> <label for="all">全选</label></li>
          <li>
            <el-popconfirm title="确定移除已选文章吗？" confirm-button-text="确定" cancel-button-text="取消" @confirm="remove">
              <template #reference>
                <el-button :disabled="!manageArr.length" type="danger" plain>移除</el-button>
              </template>
            </el-popconfirm>
          </li>
          <li v-if="manageArr.length">已选择{{ manageArr.length }}个文章</li>
        </ul>
      </div>
      <template v-if="collects.length">
        <div v-if="!articles.result?.length" class="collect-list">
          <template v-for="item in collects" :key="item.id">
            <div
              class="item card-style"
              :class="{ 'is-clickable': editingCollectId !== item.id }"
              :role="editingCollectId === item.id ? undefined : 'button'"
              :tabindex="editingCollectId === item.id ? undefined : 0"
              :aria-label="editingCollectId === item.id ? undefined : `查看收藏夹${item.name}`"
              @click="editingCollectId !== item.id && goCollectDetial(item)"
              @keydown.enter.prevent="editingCollectId !== item.id && goCollectDetial(item)"
              @keydown.space.prevent="editingCollectId !== item.id && goCollectDetial(item)"
            >
              <!-- 编辑模式 -->
              <template v-if="editingCollectId === item.id">
                <div class="edit-collect-input" @click.stop>
                  <el-input
                    ref="editInputRef"
                    v-model="editCollectName"
                    aria-label="收藏夹名称"
                    autocomplete="off"
                    name="editCollectName"
                    size="default"
                    @keyup.enter="confirmEdit(item.id)"
                    @keyup.escape="cancelEdit"
                  />
                  <div class="edit-btns">
                    <el-button type="primary" plain size="small" @click.stop="confirmEdit(item.id)">保存</el-button>
                    <el-button size="small" @click.stop="cancelEdit">取消</el-button>
                  </div>
                </div>
              </template>
              <!-- 正常展示模式 -->
              <template v-else>
                <div class="collect-header">
                  <span class="name">{{ item.name }}</span>
                  <span v-if="item.count" class="count">{{ item.count.length }}</span>
                </div>

                <!-- 编辑/删除操作按钮（仅自己可见） -->
                <div v-if="isMe" class="item-actions" @click.stop>
                  <el-tooltip effect="dark" content="编辑" placement="bottom">
                    <button type="button" class="action-icon" :aria-label="`编辑收藏夹${item.name}`" @click.stop="startEdit(item)"><Pencil aria-hidden="true" /></button>
                  </el-tooltip>
                  <el-popconfirm title="确定删除该收藏夹吗？" confirm-button-text="确定" cancel-button-text="取消" @confirm="deleteCollect(item.id)">
                    <template #reference>
                      <span @click.stop>
                        <el-tooltip effect="dark" content="删除" placement="bottom">
                          <button type="button" class="action-icon delete" :aria-label="`删除收藏夹${item.name}`"><Trash2 aria-hidden="true" /></button>
                        </el-tooltip>
                      </span>
                    </template>
                  </el-popconfirm>
                </div>

                <div class="collect-footer">
                  <span class="label">创建于</span>
                  <span class="time" v-dateformat="item.createAt"></span>
                </div>
              </template>
            </div>
          </template>
        </div>
        <div v-else>
          <template v-for="item in articles.result" :key="item.id">
            <ListItem :item="item">
              <template v-if="showCheckBox" #checkbox>
                <input name="one" type="checkbox" :value="item.id" v-model="manageArr" :aria-label="`选择文章${item.title ?? item.id}`" @change="handleCheckbox" />
              </template>
              <template #action>
                <ArticleAction :article="item" :isLiked="isLiked" :onLike="likeArticle" />
              </template>
            </ListItem>
          </template>
        </div>
      </template>
      <template v-else>
        <div class="empty-state">
          <template v-if="isMe">
            <p>你还没有创建收藏夹</p>
            <el-button type="primary" plain @click="showNewInput = true">
              <el-icon><Plus /></el-icon>
              创建第一个收藏夹
            </el-button>
          </template>
          <template v-else>
            <p>{{ sex }}还没有创建收藏夹</p>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import { useUserLikedArticles, useLikeArticle } from '@/composables/useArticleList';
import { Msg, emitter } from '@/utils';
import { Plus, Settings, ChevronLeft, Pencil, Trash2 } from '@lucide/vue';
import { useRoute } from 'vue-router';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import { useAuth } from '@/composables/useAuth';

const route = useRoute();
const userStore = useUserStore();
const articleStore = useArticleStore();
const { isCurrentUser } = useAuth();

const { userInfo, profile, collects } = storeToRefs(userStore);
const { articles } = storeToRefs(articleStore);

// 判断是否为当前登录用户（用于控制收藏夹操作权限）
const isMe = computed(() => isCurrentUser(profile.value.id));

// 用户点赞状态
const { isLiked } = useUserLikedArticles();

// 点赞操作
const { mutate: likeArticle } = useLikeArticle();

const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
const showSetup = ref(false);
const showCheckBox = ref(false);
const activeCollect = ref({ id: '', name: '' });

// 新建收藏夹相关
const showNewInput = ref(false);
const newCollectName = ref('');
const newInputRef = ref<InstanceType<(typeof import('element-plus'))['ElInput']> | null>(null);

// 编辑收藏夹相关
const editingCollectId = ref<number | null>(null);
const editCollectName = ref('');
const editInputRef = ref<InstanceType<(typeof import('element-plus'))['ElInput']> | null>(null);

// 展开输入框时自动聚焦
watch(showNewInput, (val) => {
  if (val) {
    nextTick(() => {
      newInputRef.value?.focus();
    });
  }
});

// 创建收藏夹
const createCollect = async () => {
  const name = newCollectName.value.trim();
  if (!name) return;
  await userStore.addCollectAction(name);
  cancelCreate();
};

// 取消创建
const cancelCreate = () => {
  showNewInput.value = false;
  newCollectName.value = '';
};

const toggleNewInput = () => {
  if (showNewInput.value) {
    cancelCreate();
    return;
  }
  showNewInput.value = true;
};

// 开始编辑收藏夹
const startEdit = (item: { id: number; name: string }) => {
  editingCollectId.value = item.id;
  editCollectName.value = item.name;
  nextTick(() => {
    editInputRef.value?.focus();
  });
};

// 确认编辑
const confirmEdit = async (collectId: number) => {
  const name = editCollectName.value.trim();
  if (!name) {
    Msg.showWarn('收藏夹名称不能为空');
    return;
  }
  await userStore.updateCollectAction(collectId, name);
  cancelEdit();
};

// 取消编辑
const cancelEdit = () => {
  editingCollectId.value = null;
  editCollectName.value = '';
};

// 删除收藏夹
const deleteCollect = async (collectId: number) => {
  await userStore.removeCollectAction(collectId);
};

onMounted(() => {
  emitter.on('clearResultAndBack', () => clearResultAndBack());
});

const goCollectDetial = (item) => {
  console.log('goCollectDetial', item);
  if (item.count) {
    cancelCreate();
    //获取到收藏夹名
    showSetup.value = !showSetup.value;
    const { id, name } = collects.value.find((collect) => collect.id === item.id);
    activeCollect.value = { id, name };
    //对收藏夹下的文章列表进行请求
    articleStore.refreshFirstPageAction({ idList: [...item.count] });
  } else {
    Msg.showInfo('该收藏夹还没有文章');
  }
};
const manageArr = ref<any[]>([]);
watch(
  () => manageArr.value,
  (newV) => console.log('manageArr newV', newV),
);
const handleCollect = () => {
  showCheckBox.value = !showCheckBox.value;
  manageArr.value.length && (manageArr.value = []);
};
const handleCheckbox = (e) => {
  const all = document.getElementById('all') as HTMLInputElement;
  const oneList = Array.from(document.getElementsByName('one'));
  all.checked = !oneList.find((item: any) => !item.checked);
};
const handleCheckboxAll = (e) => {
  const all = document.getElementById('all') as HTMLInputElement;
  const oneList = Array.from(document.getElementsByName('one'));
  manageArr.value = []; //初始化为空
  console.log('handleCheckboxAll all.checked', all.checked);
  // 若全选复选框选中(all.checked为true)则将所有id加入到manageArr中
  oneList.forEach((item: any) => {
    item.checked = all.checked;
    all.checked && manageArr.value.push(item.value);
  });
};
const remove = () => {
  const manageCollectArticleId = manageArr.value.map((item) => parseInt(item));
  console.log('remove', manageCollectArticleId);
  userStore.removeCollectArticle(activeCollect.value.id, manageCollectArticleId);
  showCheckBox.value = false;
};

const clearResultAndBack = () => {
  cancelCreate();
  showSetup.value = false;
  showCheckBox.value = false;
  articles.value.result = [];
  manageArr.value.length && (manageArr.value = []);
  userInfo.value?.id && userStore.getCollectAction(userInfo.value?.id);
};

watch(
  () => route.query.tabName,
  (tabName) => {
    if (tabName && tabName !== '收藏') {
      cancelCreate();
    }
  },
);

onUnmounted(() => {
  cancelCreate();
  emitter.off('clearResultAndBack');
});
</script>

<style lang="scss" scoped>
.user-collect {
  --collect-card-bg: rgba(255, 255, 255, 0.92);
  --collect-card-bg-hover: #fff;
  --collect-card-border: #d0d7de;
  --collect-card-border-hover: #409eff;
  --collect-divider: #eceff3;
  --collect-title: var(--text-primary);
  --collect-muted: #7e8792;
  --collect-count-bg: #eef1f5;
  --collect-count-text: #606266;
  --collect-icon-bg-hover: #eef5ff;
  --collect-danger-bg-hover: #fff0f0;
  --collect-danger-text: #f56c6c;
  --collect-shadow-hover: 0 10px 24px rgba(31, 45, 61, 0.1);
  --collect-focus-ring: rgba(64, 158, 255, 0.36);

  color: var(--collect-title);

  :where(html.dark) & {
    --collect-card-bg: rgba(22, 25, 30, 0.86);
    --collect-card-bg-hover: rgba(28, 33, 39, 0.94);
    --collect-card-border: var(--border-color-list);
    --collect-card-border-hover: rgba(129, 201, 149, 0.78);
    --collect-divider: var(--border-color-list);
    --collect-title: #f2f5f7;
    --collect-muted: #9aa6b2;
    --collect-count-bg: rgba(64, 158, 255, 0.16);
    --collect-count-text: #bcd6f7;
    --collect-icon-bg-hover: rgba(64, 158, 255, 0.14);
    --collect-danger-bg-hover: rgba(245, 108, 108, 0.15);
    --collect-danger-text: #ff8d8d;
    --collect-shadow-hover: 0 14px 32px rgba(0, 0, 0, 0.34);
    --collect-focus-ring: rgba(129, 201, 149, 0.44);
  }
}

.list-header {
  display: flex;
  align-items: center;
  @include thin-border(bottom, var(--border-color-list));
  padding-bottom: 10px;
  padding-left: 10px;

  h2 {
    display: flex;
    align-items: center;
    min-width: 0;
    color: var(--collect-title);
    line-height: 1.35;
  }

  .btn {
    margin-left: 10px;

    .create-toggle-icon {
      transition: transform 0.2s ease;

      &.is-active {
        transform: rotate(45deg);
      }
    }
  }

  .back {
    display: inline-flex;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--collect-muted);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    svg {
      width: 25px;
      height: 25px;
    }

    &:hover {
      background-color: var(--collect-icon-bg-hover);
      color: var(--collect-card-border-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--collect-focus-ring);
      outline-offset: 2px;
    }
  }
}

.list {
  padding: 0 20px;
  color: var(--collect-title);

  .new-collect-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    @include thin-border(bottom, var(--border-color-list));

    .el-input {
      flex: 1;
      max-width: 300px;
    }
  }

  .setting {
    display: flex;
    align-items: center;
    list-style: none;
    padding: 10px 0;
    color: var(--collect-muted);

    li {
      margin-right: 20px;
    }

    input[type='checkbox'] {
      accent-color: var(--el-color-primary);
    }
  }

  .collect-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding: 10px 0;
  }

  .item.card-style {
    min-height: 128px;
    border: 1px solid var(--collect-card-border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    background-color: var(--collect-card-bg);
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    /* Reset thin-border mixin if it was applied via class */
    &::after {
      display: none;
    }

    &.is-clickable {
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid var(--collect-focus-ring);
        outline-offset: 2px;
      }
    }

    &:hover {
      border-color: var(--collect-card-border-hover);
      background-color: var(--collect-card-bg-hover);
      box-shadow: var(--collect-shadow-hover);
      transform: translateY(-2px);
    }

    .collect-header {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      font-size: 18px;
      font-weight: 600;
      color: var(--collect-title);

      .name {
        margin-right: 8px;
        min-width: 0;
        word-break: break-all;
        line-height: 1.4;
      }

      .count {
        display: inline-block;
        min-width: 20px;
        height: 20px;
        line-height: 20px;
        text-align: center;
        font-size: 12px;
        color: var(--collect-count-text);
        background-color: var(--collect-count-bg);
        border-radius: 6px;
        padding: 0 6px;
        flex-shrink: 0;
      }
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .action-icon {
        display: inline-flex;
        width: 28px;
        height: 28px;
        align-items: center;
        justify-content: center;
        border: 0;
        color: var(--collect-muted);
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        transition:
          background-color 0.2s ease,
          color 0.2s ease;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover {
          background-color: var(--collect-icon-bg-hover);
          color: var(--collect-card-border-hover);
        }

        &:focus-visible {
          outline: 2px solid var(--collect-focus-ring);
          outline-offset: 2px;
        }

        &.delete:hover {
          color: var(--collect-danger-text);
          background-color: var(--collect-danger-bg-hover);
        }
      }
    }

    .collect-footer {
      display: flex;
      align-items: center;
      font-size: 12px;
      color: var(--collect-muted);
      margin-top: auto;

      .label {
        margin-right: 4px;
      }
    }

    .edit-collect-input {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;

      .el-input {
        width: 100%;
      }

      .edit-btns {
        display: flex;
        justify-content: flex-end;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--collect-muted);

    p {
      margin-bottom: 16px;
      font-size: 16px;
    }

    .el-button {
      .el-icon {
        margin-right: 4px;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .list-header .btn .create-toggle-icon {
    transition: none;
  }

  .list .item.card-style {
    transition: none;

    &:hover {
      transform: none;
    }
  }
}
</style>
