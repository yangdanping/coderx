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
  width: 120px;
  /* padding: 0 20px; */
  cursor: pointer;
  .logo {
    width: 100%;
  }
}
</style>
