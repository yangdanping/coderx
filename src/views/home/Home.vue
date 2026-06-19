<template>
  <div class="home">
    <div class="content">
      <div class="title-section">
        <div class="title">
          <div class="title-line-1">Welcome to</div>
          <div class="title-line-2">
            <ScrambleFrameText class="title-word" :frame="frame" :target="target" />
          </div>
          <HomeExploreLink class="title-explore-link" />
        </div>
        <RetroComputerShader class="shader" :screen-saver-text="screenFrame" screen-saver-collision-text="creatorx" @wall-hit="advanceOnWallHit" />
        <!-- <CodeSpotlight class="shader" /> -->
      </div>
      <hr />
      <FeatureSection :columns="1" />
      <hr />
      <SectionTitle id="hot-authors">热门作者</SectionTitle>
      <HomeHotUser :hotUsers="hotUsers.slice(0, 3)" />
      <hr />
      <div class="brief">
        <div>Power By ⚡⚡yangdanping⚡⚡</div>
        <div>Email📧:1240645840@qq.com</div>
        <div class="btn" role="button" @click="goGitHub">GitHub😺:{{ githubUrl }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import HomeHotUser from './cpns/HomeHotUser.vue';
import HomeExploreLink from './cpns/HomeExploreLink.vue';
import SectionTitle from './cpns/SectionTitle.vue';
import FeatureSection from './cpns/features/FeatureSection.vue';
import { ScrambleFrameText } from '@/components/scramble';
import RetroComputerShader from '@/components/canvas/retro-computer-shader/RetroComputerShader.vue';
// import CodeSpotlight from '@/components/canvas/code-spot-light/CodeSpotlight.vue';
import useHomeStore from '@/stores/home.store';
import { useWallHitScramble } from './composables/useWallHitScramble';

const homeStore = useHomeStore();
const { hotUsers } = storeToRefs(homeStore);
const { frame, screenFrame, target, advanceOnWallHit } = useWallHitScramble();

const githubUrl = ref('https://github.com/yangdanping');

const goGitHub = () => window.open(githubUrl.value);

onMounted(() => {
  homeStore.getHotUsersAction();
});
</script>

<style lang="scss" scoped>
$TitleSize: 2em;

.home {
  > .content {
    max-width: 80%;
    margin: 0 auto;

    .title-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
      margin: 150px 0 90px 0;
      // padding: 80px 0;

      .title {
        display: flex;
        flex-direction: column;
        flex: 0 1 auto;
        min-width: 0;
        max-width: 100%;
        /* 
           clamp(min, preferred, max) 函数用于设置响应式字体大小
           - min: 40px (最小值，防止在小屏幕下文字过小)
           - preferred: 3.9vw (中等宽度下平滑缩小，给最长角色词和 Retro 留出并排空间)
           - max: 70px (最大值，防止在大屏幕下文字过大)
        */
        font-size: clamp(40px, 3.9vw, 70px);
        user-select: none;
        transition: all 0.5s;
        font-family: 'GeistPixel-Line', sans-serif;
        .title-line-1 {
          -webkit-animation: tracking-in-expand 1s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          animation: tracking-in-expand 1s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          // font-family: 'MapleMono', sans-serif;
        }
        .title-line-2 {
          line-height: $TitleSize;
          height: $TitleSize;
          font-size: $TitleSize;
          display: flex;
          align-items: baseline;
          white-space: nowrap;
          width: fit-content;
          max-width: 100%;

          .title-word {
            --active-x-gradient: var(--coder-x-gradient);
            // X 动画字符格：分别控制宽度、左侧间隔和右侧安全留白。
            --scramble-x-cell-width: 1.18ch;
            --scramble-x-gap: 0.02em;
            --scramble-x-right-space: 0.2em;

            display: inline-flex;
            width: fit-content;
            max-width: 100%;
            padding-inline: 0.08em;
            overflow: visible;
          }

          .title-word[data-scramble-word='WriterX'] {
            --active-x-gradient: var(--writer-x-gradient);
          }

          .title-word[data-scramble-word='CreatorX'] {
            --active-x-gradient: var(--creator-x-gradient);
          }

          .title-word[data-scramble-word='BuilderX'] {
            --active-x-gradient: var(--builder-x-gradient);
          }

          .title-word :deep(.scrambl-cell) {
            overflow: visible !important;
          }

          .title-word :deep(.scrambl-cell:first-child) {
            width: 1.08ch !important;
            max-width: 1.08ch !important;
            justify-content: flex-end !important;
          }

          .title-word :deep(.scramble-accent-character) {
            box-sizing: content-box;
            width: var(--scramble-x-cell-width) !important;
            max-width: var(--scramble-x-cell-width) !important;
            justify-content: flex-start !important;
          }

          .title-word :deep(.scramble-accent-character),
          .title-word :deep(.scramble-last-character) {
            margin-left: var(--scramble-x-gap);
            padding-right: var(--scramble-x-right-space);
            font-style: oblique;
            background-image: var(--active-x-gradient);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            font-family: sans-serif;
            text-shadow: none;
          }
        }
        &:hover {
          text-shadow: 4px 4px var(--text-shadow);
        }

        .title-explore-link {
          align-self: flex-start;
          margin-top: clamp(26px, 3vw, 42px);
          text-shadow: none;
        }
      }

      .shader {
        flex: 1;
        min-width: 300px;
        height: 600px;
        align-self: stretch;
        max-width: 800px;
      }

      // 响应式：最长角色词与 Retro 接近冲突前切换为堆叠布局。
      @media screen and (max-width: 1040px) {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 40px 0;

        .title {
          align-items: center;

          .title-explore-link {
            align-self: center;
          }
        }

        .shader {
          // 画布突破正文的 80% 宽度，为 Retro 两侧轨道和屏保文字保留位图空间。
          width: min(100vw, 520px);
          height: auto;
          aspect-ratio: 1 / 1;
          max-width: none;
          min-width: 0;
          margin: 0;
          align-self: center;
        }
      }

      @media screen and (max-width: 600px) {
        // 手机端让 Hero 脱离正文 80% 宽度，保证 100vw Retro 画布真正居中。
        width: 100vw;
        margin-left: calc(50% - 50vw);
        margin-right: calc(50% - 50vw);

        .title {
          // 小屏适度放大标题，并用整屏宽度容纳最长 CreatorX 的扰动帧。
          width: min(100vw, 560px);
          max-width: none;
          font-size: clamp(40px, 11.5vw, 52px);

          .title-line-2 .title-word {
            // 手机宽度紧张时移除装饰内边距，避免 BuilderX / CreatorX 被视口裁切。
            padding-inline: 0;
          }
        }

        .shader {
          width: min(100vw, 520px);
        }
      }
    }

    .brief {
      height: 500px;
      display: flex;
      flex-direction: column;
      font-family: 'GeistPixel-Line', sans-serif;
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
