<template>
  <div class="detail-collect">
    <div class="title">
      <h2>添加到收藏夹</h2>
      <el-tooltip effect="dark" content="查看我的收藏" placement="top">
        <el-icon class="btn" @click="goProfile" size="23" color="#999" style="cursor: pointer"> <IArrowRightBold /> </el-icon>
      </el-tooltip>
    </div>
    <div class="collect-list">
      <template v-if="collects.length">
        <div v-for="item in collects" :key="item.id" @click="addToCollect(item.id)" class="item">
          <div class="item-left">
            <div>{{ item.name }}</div>
            <div v-if="item.count" class="count">{{ item.count.length }}</div>
          </div>
          <i v-if="isCollected(item.count)">
            <el-icon size="22px" color="#81c995"><ISuccessFilled /></el-icon>
          </i>
          <!-- <i v-if="isCollected(item.count)" class="el-icon-success" style="color: #81c995; font-size: 22px"></i> -->
        </div>
      </template>
      <template v-else>
        <div class="show-msg"><h2>暂无收藏夹☺新建一个吧~</h2></div>
      </template>
    </div>
    <div class="new-btn">
      <template v-if="!newCollect"><el-button @click="newCollect = true">新建收藏夹</el-button></template>
      <template v-else>
        <el-input placeholder="请输入新收藏夹" v-model="input" class="search" clearable>
          <template #append>
            <el-button @click="add" :icon="Plus" :disabled="btnDisabled"></el-button>
          </template>
        </el-input>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { emitter } from '@/utils';
import { Plus } from '@element-plus/icons-vue';

import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const userStore = useUserStore();
const articleStore = useArticleStore();
const { collects, userInfo } = storeToRefs(userStore);
const { article } = storeToRefs(articleStore);
const router = useRouter();
const btnDisabled = ref(true);
const newCollect = ref(false);
const input = ref('');

watch(
  () => input.value,
  (newV) => {
    btnDisabled.value = newV ? false : true;
  },
);
const isCollected = computed(() => {
  return (count) => count && count.some((v) => v === article.value.id);
});
onMounted(() => {
  emitter.on('hideCollect', () => {
    newCollect.value = false;
    input.value = '';
  });
});
const goProfile = () => {
  const routeData = router.resolve({
    path: `/user/${userInfo.value.id}`,
    query: { tabName: '收藏' },
  });
  window.open(routeData.href, '_blank');
};

const add = () => {
  userStore.addCollectAction(input.value);
  input.value = '';
  newCollect.value = false;
};
const addToCollect = (collectId) => {
  console.log(collectId);
  userStore.collectAction({ collectId, articleId: article.value.id });
};
</script>

<style lang="scss" scoped>
.title {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
  .btn {
    position: absolute;
    top: 14px;
    right: 0;
  }
}

.collect-list {
  height: 140px;
  width: 100%;
  overflow-y: auto;
  border: 1px solid #eceeef;
  .show-msg {
    margin: 50px auto;
    text-align: center;
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    cursor: pointer;
    .item-left {
      display: flex;
      align-items: center;
      .count {
        height: 20px;
        width: 20px;
        line-height: 20px;
        text-align: center;
        color: #b9bec2;
        background-color: #f2f2f2;
        border-radius: 50%;
        margin-left: 10px;
      }
    }
  }
  .item:hover {
    background-color: #f8f9fa;
  }
}
.new-btn {
  display: flex;
  padding: 8px;
}
</style>
