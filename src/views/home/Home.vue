<template>
  <div class="home">
    <NavBar />
    <h2>Home{{ counter }}</h2>
    <button @click="decrement">-1</button>
    <button @click="increment()">+1</button>
  </div>
</template>

<script lang="ts" setup>
import NavBar from '@/components/navbar/NavBar.vue';
import { ref } from 'vue';

ref(0);
const counter = ref(0);
const increment = (e: PointerEvent) => {
  counter.value++;
  console.log(e);
};
const decrement = () => counter.value--;
</script>

<style lang="scss" scoped></style>
