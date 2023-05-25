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
  max-width: 120px;
  min-width: 100px;
  /* padding: 0 20px; */
  cursor: pointer;
  .logo {
    width: 100%;
  }
}
</style>
