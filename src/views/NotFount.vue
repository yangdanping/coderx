<template>
  <div class="not-found">
    <div class="content">
      {{ textStr }}
    </div>
  </div>
</template>

<script lang="ts" setup>
const text = ref('404 Not Found');
const textStr = ref('');
const counter = ref(1);
let timer = ref();

onMounted(() => {
  timer.value = setInterval(() => {
    let str = text.value.slice(0, counter.value);
    counter.value++;
    if (counter.value <= text.value.length + 1) {
      str = str + '|';
    } else {
      clearInterval(timer.value);
    }
    textStr.value = str;
  }, 100);
});

onUnmounted(() => {
  if (timer.value) clearInterval(timer.value);
});
</script>

<style lang="scss" scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: clamp(40px, 10vw, 70px);
  // font-family: 'MapleMono', sans-serif;
  color: #5f5f5f;
}
</style>
