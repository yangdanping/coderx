<template>
  <div class="user-collect">
    <div class="list-header">
      <div v-if="articles.result?.length">
        <h2>
          <el-icon class="back" @click="clearResultAndBack"><IBack /></el-icon>收藏夹"{{ activeCollect.name }}"下的文章({{ articles.result?.length }})
        </h2>
      </div>
      <div v-else>
        <h2>{{ sex }}的收藏({{ collects.length }})</h2>
      </div>
      <div class="btn">
        <template v-if="isUser(profile.id) && !showSetup">
          <el-tooltip effect="dark" content="添加收藏夹" placement="right">
            <el-button @click="dialogVisible = true" :icon="Plus" circle></el-button>
          </el-tooltip>
        </template>
        <template v-else>
          <el-tooltip effect="dark" content="批量操作" placement="right">
            <el-button @click="handleCollect" :icon="Setting" circle></el-button>
          </el-tooltip>
        </template>
      </div>
    </div>
    <div class="list">
      <!-- 批量操作 -->
      <div v-if="showCheckBox">
        <ul class="setting">
          <li><input id="all" type="checkbox" @change="handleCheckboxAll" /> <label for="all">全选</label></li>
          <li>
            <el-button @click="remove" :disabled="!!!manageArr.length" type="danger">移除</el-button>
          </li>
          <li v-if="manageArr.length">已选择{{ manageArr.length }}个文章</li>
        </ul>
      </div>
      <template v-if="collects.length">
        <div v-if="!articles.result?.length" class="collect-list">
          <template v-for="item in collects" :key="item.id">
            <div class="item">
              <div class="collect-name" @click="goCollectDetial(item)">
                <div>{{ item.name }}</div>
                <div v-if="item.count" class="count">{{ item.count.length }}</div>
              </div>
              <span class="collect-time">创建于{{ item.createAt }}</span>
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
                <ArticleAction :article="item" />
              </template>
            </ListItem>
          </template>
        </div>
      </template>
      <template v-else><span>这个人未创建过收藏夹</span></template>
    </div>
    <el-dialog v-model="dialogVisible" append-to-body destroy-on-close center width="600px">
      <DetailCollect />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import DetailCollect from '@/views/detail/cpns/detail/DetailCollect.vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import { Msg, emitter } from '@/utils';
import { Plus, Setting } from '@element-plus/icons-vue';

import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const userStore = useUserStore();
const articleStore = useArticleStore();

const { userInfo, profile, collects, isUser } = storeToRefs(userStore);
const { articles } = storeToRefs(articleStore);
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
const dialogVisible = ref(false);
const showSetup = ref(false);
const showCheckBox = ref(false);
const activeCollect = ref({ id: '', name: '' });
const route = useRoute();

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
    articleStore.getArticleListAction('', [...item.count] as any);
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
  userStore.getCollectAction(userStore.userInfo.id);
};
</script>

<style lang="scss" scoped>
.list-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
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

  .setting {
    display: flex;
    align-items: center;
    list-style: none;
    padding: 10px 0;
    li {
      margin-right: 20px;
    }
  }

  .item {
    border-bottom: 1px solid #e5e6eb;
    cursor: pointer;
    .collect-name {
      display: flex;
      align-items: center;
      font-size: 30px;
      padding: 15px 0;
      .count {
        width: 30px;
        height: 30px;
        line-height: 30px;
        text-align: center;
        color: #b9bec2;
        background-color: #f2f2f2;
        border-radius: 50%;
        margin-left: 10px;
      }
    }
    .collect-time {
      font-size: 18px;
    }
  }
}
</style>
