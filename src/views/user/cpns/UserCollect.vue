<template>
  <div class="user-collect">
    <div class="list-header">
      <div v-if="!articles.result?.length">
        <h2>{{ sex }}的收藏({{ collects.length }})</h2>
      </div>
      <div v-else>
        <h2>
          <el-icon class="back" @click="articles.result = []"><IBack /></el-icon>收藏夹"{{ activeCollect }}"下的文章({{ articles.result.length }})
        </h2>
      </div>
      <div class="collect" v-if="isUser(profile.id)">
        <el-tooltip effect="dark" content="添加收藏夹" placement="right">
          <el-button @click="dialogVisible = true" :icon="Plus" circle></el-button>
        </el-tooltip>
      </div>
    </div>
    <div class="list">
      <template v-if="collects.length">
        <div v-if="!articles.result?.length">
          <template v-for="item in collects" :key="item.id">
            <div class="collect-wrapper">
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
import { Msg } from '@/utils';
import { Plus } from '@element-plus/icons-vue';

import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const userStore = useUserStore();
const articleStore = useArticleStore();
const router = useRouter();

const { profile, collects, isUser } = storeToRefs(userStore);
const { articles } = storeToRefs(articleStore);
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));
const dialogVisible = ref(false);
const activeCollect = ref('');

const goCollectDetial = (item) => {
  console.log('goCollectDetial', item.count);
  if (item.count) {
    //获取到收藏夹名
    activeCollect.value = collects.value.find((collect) => collect.id === item.id).name;
    //对收藏夹下的文章列表进行请求
    articleStore.getArticleListAction('', [...item.count] as any);
  } else {
    Msg.showInfo('该收藏夹还没有文章');
  }
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
  .collect {
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
  .collect-wrapper {
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
