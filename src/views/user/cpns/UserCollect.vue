<template>
  <div class="user-collect">
    <div class="list-header">
      <div v-if="!articles.length">
        <h2>{{ sex }}的收藏({{ collects.length }})</h2>
      </div>
      <div v-else>
        <h2>
          <el-icon class="back" @click="articles = []"><IBack /></el-icon>收藏夹"{{ activeCollect }}"下的文章({{ articles.length }})
        </h2>
      </div>
    </div>
    <template v-if="collects.length">
      <div v-if="!articles.length">
        <template v-for="item in collects" :key="item.id">
          <div class="collect-wrapper">
            <div class="collect-name" @click="goCollectDetial(item.id, item.count)">{{ item.name }}{{ item.count ? `(${item.count.length})` : '' }}</div>
            <span class="collect-time">创建于{{ item.createAt }}</span>
          </div>
        </template>
      </div>
      <div v-else>
        <template v-for="item in articles" :key="item.id">
          <div class="content-wrapper">
            <div class="content-main">
              <div class="content" @click="goDetail(item.id)">
                <a class="title">{{ item.title }}</a>
                <div>
                  <span>{{ item.createAt }}</span>
                  <p class="abstract">{{ item.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template v-else><span>这个人未创建过收藏夹</span></template>
  </div>
</template>

<script lang="ts" setup>
import useUserStore from '@/stores/user';
import { getArtcileByCollectId } from '@/service/user/user.request';
import { Msg, timeFormat } from '@/utils';
import type { IArticle } from '@/stores/types/article.result';
const router = useRouter();
const userStore = useUserStore();

const { profile, collects } = storeToRefs(userStore);
const sex = computed(() => (profile.value.sex === '男' ? '他' : '她'));

const articles = ref<IArticle[]>([]);
const activeCollect = ref('');

const goCollectDetial = (itemId, count) => {
  console.log(count);
  if (!count) {
    Msg.showInfo('该收藏夹还没有文章');
  } else {
    const userId = profile.value.id;
    getArtcileByCollectId(userId, itemId).then((res) => {
      if (res.code === 0) {
        activeCollect.value = collects.value.find((collect) => collect.id === itemId).name;
        console.log('选中的收藏夹为', activeCollect.value);
        res.data.forEach((article) => (article.createAt = timeFormat(article.createAt)));
        articles.value = res.data;
      }
      console.log('getArtcileByCollectId', res);
    });
  }
};
const goDetail = (articleId) => router.push({ path: `/article/${articleId}` });
</script>

<style lang="scss" scoped>
.list-header {
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
  h2 {
    display: flex;
    align-items: center;
  }

  .back {
    font-size: 25px;
    margin-right: 8px;
    cursor: pointer;
  }
}

.collect-wrapper {
  border-bottom: 1px solid #e5e6eb;
  .collect-name {
    font-size: 30px;
    padding: 15px 0;
    cursor: pointer;
  }
  .collect-time {
    font-size: 18px;
  }
}
.content-wrapper {
  display: flex;
  border-bottom: 1px solid #e5e6eb;
  padding-bottom: 15px;

  .content-main {
    margin: 20px 0 20px 20px;
    .content {
      cursor: pointer;
    }
    .title {
      font-weight: 700;
      font-size: 24px;
    }
    .abstract {
      height: 20px;
      width: 800px;
      padding: 15px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
