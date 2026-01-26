<template>
  <div class="user-collect">
    <div class="list-header">
      <div v-if="articles.result?.length">
        <h2>
          <el-icon class="back" @click="clearResultAndBack"><ChevronLeft /></el-icon>收藏夹"{{ activeCollect.name }}"下的文章({{ articles.result?.length }})
        </h2>
      </div>
      <div v-else>
        <h2>{{ sex }}的收藏({{ collects.length }})</h2>
      </div>
      <div class="btn">
        <template v-if="isMe && !showSetup">
          <el-tooltip effect="dark" content="新建收藏夹" placement="right">
            <el-button @click="showNewInput = !showNewInput" :icon="Plus" circle></el-button>
          </el-tooltip>
        </template>
        <template v-if="showSetup">
          <el-tooltip effect="dark" content="批量操作" placement="right">
            <el-button @click="handleCollect" :icon="Settings" circle></el-button>
          </el-tooltip>
        </template>
      </div>
    </div>
    <div class="list">
      <!-- 新建收藏夹 inline 输入 -->
      <div v-if="showNewInput" class="new-collect-input">
        <el-input ref="newInputRef" v-model="newCollectName" placeholder="输入收藏夹名称" clearable @keyup.enter="createCollect" @keyup.escape="cancelCreate">
          <template #append>
            <el-button @click="createCollect" :disabled="!newCollectName.trim()">确定</el-button>
          </template>
        </el-input>
        <el-button class="cancel-btn" text @click="cancelCreate">取消</el-button>
      </div>
      <!-- 批量操作 -->
      <div v-if="showCheckBox">
        <ul class="setting">
          <li><input id="all" type="checkbox" @change="handleCheckboxAll" /> <label for="all">全选</label></li>
          <li>
            <el-button @click="remove" :disabled="!!!manageArr.length" type="danger" plain>移除</el-button>
          </li>
          <li v-if="manageArr.length">已选择{{ manageArr.length }}个文章</li>
        </ul>
      </div>
      <template v-if="collects.length">
        <div v-if="!articles.result?.length" class="collect-list">
          <template v-for="item in collects" :key="item.id">
            <div class="item card-style">
              <!-- 编辑模式 -->
              <template v-if="editingCollectId === item.id">
                <div class="edit-collect-input">
                  <el-input ref="editInputRef" v-model="editCollectName" size="default" @keyup.enter="confirmEdit(item.id)" @keyup.escape="cancelEdit" />
                  <div class="edit-btns">
                    <el-button type="primary" plain size="small" @click="confirmEdit(item.id)">保存</el-button>
                    <el-button size="small" @click="cancelEdit">取消</el-button>
                  </div>
                </div>
              </template>
              <!-- 正常展示模式 -->
              <template v-else>
                <div class="collect-header" @click="goCollectDetial(item)">
                  <span class="name">{{ item.name }}</span>
                  <span v-if="item.count" class="count">{{ item.count.length }}</span>
                </div>

                <!-- 编辑/删除操作按钮（仅自己可见） -->
                <div v-if="isMe" class="item-actions">
                  <el-tooltip effect="dark" content="编辑" placement="bottom">
                    <el-icon class="action-icon" @click.stop="startEdit(item)"><Pencil /></el-icon>
                  </el-tooltip>
                  <el-popconfirm title="确定删除该收藏夹吗？" confirm-button-text="确定" cancel-button-text="取消" @confirm="deleteCollect(item.id)">
                    <template #reference>
                      <div @click.stop>
                        <el-tooltip effect="dark" content="删除" placement="bottom">
                          <el-icon class="action-icon delete"><Trash2 /></el-icon>
                        </el-tooltip>
                      </div>
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
                <input name="one" type="checkbox" :value="item.id" v-model="manageArr" @change="handleCheckbox" />
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
import { Plus, Settings, ChevronLeft, Pencil, Trash2 } from 'lucide-vue-next';

import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import { useAuth } from '@/composables/useAuth';

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
  showSetup.value = false;
  showCheckBox.value = false;
  articles.value.result = [];
  manageArr.value.length && (manageArr.value = []);
  userInfo.value?.id && userStore.getCollectAction(userInfo.value?.id);
};

onUnmounted(() => {
  emitter.off('clearResultAndBack');
});
</script>

<style lang="scss" scoped>
.list-header {
  display: flex;
  align-items: center;
  @include thin-border(bottom, #eee);
  padding-bottom: 10px;
  padding-left: 10px;
  h2 {
    display: flex;
    align-items: center;
  }
  .btn {
    margin-left: 10px;
  }

  .back {
    font-size: 25px;
    margin-right: 8px;
    cursor: pointer;
  }
}
.list {
  padding: 0 20px;

  .new-collect-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    @include thin-border(bottom, #eee);

    .el-input {
      flex: 1;
      max-width: 300px;
    }

    .cancel-btn {
      color: #909399;
    }
  }

  .setting {
    display: flex;
    align-items: center;
    list-style: none;
    padding: 10px 0;
    li {
      margin-right: 20px;
    }
  }

  .collect-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding: 10px 0;
  }

  .item.card-style {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    background-color: #fff;
    transition: all 0.2s ease-in-out;
    /* Reset thin-border mixin if it was applied via class */
    &::after {
      display: none;
    }

    &:hover {
      border-color: #409eff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transform: translateY(-2px);
    }

    .collect-header {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 18px;
      font-weight: 600;
      color: #303133;

      .name {
        margin-right: 8px;
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
        color: #606266;
        background-color: #f0f2f5;
        border-radius: 10px;
        padding: 0 6px;
        flex-shrink: 0;
      }
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .action-icon {
        font-size: 16px;
        color: #909399;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;

        &:hover {
          background-color: #f2f6fc;
          color: #409eff;
        }

        &.delete:hover {
          color: #f56c6c;
          background-color: #fef0f0;
        }
      }
    }

    .collect-footer {
      display: flex;
      align-items: center;
      font-size: 12px;
      color: #909399;
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
    color: #909399;

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
</style>
