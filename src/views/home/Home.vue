<template>
  <div class="home">
    <NavBar />
    <div class="content">
      <div class="title">
        <div class="title-line-1">Welcome to</div>
        <!-- <div class="title-line-2">Coder<i class="text-pop-up-top">X</i></div> -->
        <div class="title-line-2" :class="{ isLast }">{{ line2Str }}</div>
      </div>
      <hr />
      <div class="box">
        <div>Power By ⚡⚡yangdanping⚡⚡</div>
        <div>Email📧:1240645840@qq.com</div>
        <div>GitHub😺:https://github.com/yangdanping</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import { ref, onMounted, computed } from 'vue';
const counter = ref(1);
const line2 = ref('Coder');
const line2Str = ref('');
const isLast = ref(false); //是否激活最后一个字符的class
let timer = ref();

onMounted(() => {
  timer.value = setInterval(() => {
    let str = line2.value.slice(0, counter.value);
    console.log(`打印${counter.value}个字母`, str);
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
});
</script>

<style lang="scss" scoped>
$TitleSize: 2em;

.home {
  background: var(--bg);
  transition: background-color 1s;
  > .content {
    max-width: 1432px;
    margin: 0 auto;

    .title {
      display: flex;
      flex-direction: column;
      margin: 200px 0;
      font-size: 79px;
      user-select: none;
      /* color: #000; */
      color: #484848;

      transition: all 0.5s;

      .title-line-1 {
        -webkit-animation: tracking-in-expand 0.7s cubic-bezier(0.215, 0.61, 0.355, 1) both;
        animation: tracking-in-expand 0.7s cubic-bezier(0.215, 0.61, 0.355, 1) both;
      }
      .title-line-2 {
        line-height: $TitleSize;
        height: $TitleSize;
        font-size: $TitleSize;
      }
      .isLast:after {
        content: 'X';
        font-style: oblique;
        padding-right: 30px;
        background: linear-gradient(to right, rgb(255, 128, 128), rgb(96, 239, 177));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
    }

    @media screen and (max-width: 880px) {
      .title {
        font-size: 70px;
      }
    }
    @media screen and (max-width: 630px) {
      .title {
        font-size: 40px;
      }
    }

    .box {
      height: 500px;
      display: flex;
      flex-direction: column;
      font-size: 30px;
      justify-content: center;
      align-items: center;
      color: #5f5f5f;
      div {
        padding: 20px 0;
        transition: all 0.3s;
      }
    }
  }
}
</style>
