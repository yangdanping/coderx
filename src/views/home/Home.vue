<template>
  <div class="home">
    <div class="content">
      <div class="title">
        <div class="title-line-1">Welcome to</div>
        <div class="title-line-2" :class="{ isLast }">{{ line2Str }}</div>
      </div>
      <hr />
      <HomeHotUser :hotUsers="hotUsers.slice(0, 3)" />
      <hr />
      <HomeSwpier :news="news" />
      <hr />
      <div class="brief">
        <div>Power By ⚡⚡yangdanping⚡⚡</div>
        <div>Email📧:1240645840@qq.com</div>
        <div class="btn" @click="goGitHub">GitHub😺:{{ githubUrl }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import HomeHotUser from './cpns/HomeHotUser.vue';
import HomeSwpier from './cpns/HomeSwpier.vue';
import useHomeStore from '@/stores/home.store';
const counter = ref(1);
const line2 = ref('Coder');
const line2Str = ref('');
const githubUrl = ref('https://github.com/yangdanping');
const isLast = ref(false); //是否激活最后一个字符的class
let timer = ref();
const homeStore = useHomeStore();
const { news, hotUsers } = storeToRefs(homeStore);
onMounted(() => {
  timer.value = setInterval(() => {
    let str = line2.value.slice(0, counter.value);
    // console.log(`打印${counter.value}个字母`, str);
    counter.value++;
    // 还有最后一个字符X,所以+1
    if (counter.value <= line2.value.length + 1) {
      str = str + '|';
    } else {
      counter.value = 0;
      isLast.value = true;
      clearInterval(timer.value);
    }
    line2Str.value = str;
  }, 300);
  homeStore.getNewsAction();
  homeStore.getHotUsersAction();
});

const goGitHub = () => window.open(githubUrl.value);
</script>

<style lang="scss" scoped>
$TitleSize: 2em;

.home {
  > .content {
    max-width: 80%;
    margin: 0 auto;

    .title {
      display: flex;
      flex-direction: column;
      padding: 150px 0;
      /* 
         clamp(min, preferred, max) 函数用于设置响应式字体大小
         - min: 40px (最小值，防止在小屏幕下文字过小)
         - preferred: 10vw (首选值，10vw 表示屏幕宽度的 10%，实现随屏幕宽度动态缩放)
         - max: 70px (最大值，防止在大屏幕下文字过大)
      */
      font-size: clamp(40px, 10vw, 70px);
      user-select: none;
      transition: all 0.5s;

      .title-line-1 {
        -webkit-animation: tracking-in-expand 0.7s cubic-bezier(0.215, 0.61, 0.355, 1) both;
        animation: tracking-in-expand 0.7s cubic-bezier(0.215, 0.61, 0.355, 1) both;
        // font-family: 'MapleMono', sans-serif;
      }
      .title-line-2 {
        line-height: $TitleSize;
        height: $TitleSize;
        font-size: $TitleSize;
      }
      .isLast:after {
        content: 'X';
        font-style: oblique;
        // font-family: 'SmileySans', italic;
        padding-right: 30px;
        background-image: linear-gradient(135deg, #8feb87 10%, #3848f9 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
    }

    .brief {
      height: 500px;
      display: flex;
      flex-direction: column;
      font-family: 'MapleMono', sans-serif;
      /* 
         同样使用 clamp() 实现 brief 部分的响应式字体
         - 最小值 16px，理想值 4vw (屏幕宽度的 4%)，最大值 30px
      */
      font-size: clamp(16px, 4vw, 30px);
      justify-content: center;
      align-items: center;
      color: #5f5f5f;
      div {
        padding: 20px 0;
        transition: all 0.3s;
      }
    }
  }

  /* @media screen and (max-width: 880px) {
    .title {
      font-size: 70px;
    }
    .brief {
      font-size: 25px;
    }
  }
  @media screen and (max-width: 630px) {
    .title {
      font-size: 40px;
    }
    .brief {
      font-size: 16px;
    }
  } */
}
</style>
