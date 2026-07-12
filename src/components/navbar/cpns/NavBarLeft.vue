<template>
  <div class="left">
    <a href="/" aria-label="返回首页" @click.prevent="goHome">
      <img class="logo" src="@/assets/img/logo.svg" width="158" height="55" alt="" />
    </a>
  </div>
</template>

<script lang="ts" setup>
const router = useRouter();
const goHome = () => {
  router.push('/');
};
</script>

<style lang="scss" scoped>
.left {
  max-width: 90px;
  min-width: 90px;
  cursor: pointer;
  flex-shrink: 0;
  .logo {
    width: 100%;
    height: auto;
    display: block;
  }
}

@media (max-width: 768px) {
  .left {
    min-width: 88px;
    max-width: 88px;
  }
}
</style>
