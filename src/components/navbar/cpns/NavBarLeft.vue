<template>
  <div class="left">
    <a href="/" @click.prevent="goHome">
      <img class="logo" src="@/assets/img/logo.svg" alt="" />
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
  max-width: 80px;
  min-width: 80px;
  cursor: pointer;
  flex-shrink: 0;
  .logo {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .left {
    min-width: 64px;
    max-width: 64px;
  }
}
</style>
