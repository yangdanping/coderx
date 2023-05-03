<template>
  <div class="ValidCode disabled-select" :style="`width:${width}; height:${height}`" @click="refreshCode">
    <span v-for="(item, index) in codeList" :key="index" :style="getStyle(item)">{{ item.code }}</span>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps({
  width: {
    type: String,
    default: '100px'
  },
  height: {
    type: String,
    default: '40px'
  },
  length: {
    type: Number,
    default: 4
  },
  refresh: {
    type: Number
  }
});
watch(
  () => props.refresh,
  () => createdCode()
); //监听分页数据变化
onMounted(() => {
  createdCode();
});

const codeList = ref<any[]>([]);
const myCodeList = ref<any[]>([]);
const createdCode = () => {
  const len = props.length;
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
  const charsLen = chars.length;
  // 生成
  for (let i = 0; i < len; i++) {
    const rgb = [Math.round(Math.random() * 220), Math.round(Math.random() * 240), Math.round(Math.random() * 200)];
    myCodeList.value.push({
      code: chars.charAt(Math.floor(Math.random() * charsLen)),
      color: `rgb(${rgb})`,
      fontSize: `${10 + (+[Math.floor(Math.random() * 10)] + 6)}px`,
      padding: `${[Math.floor(Math.random() * 10)]}px`,
      transform: `rotate(${Math.floor(Math.random() * 90) - Math.floor(Math.random() * 90)}deg)`
    });
  }
  // 指向
  codeList.value = myCodeList.value;
  // 将当前数据派发出去
  // console.log(codeList.map(item => item.code).join(''))
  // 使用defineEmits发出事件---------------------
};
const emit = defineEmits(['input']);
const emitEvent = () => emit('input', myCodeList.value.map((item) => item.code).join(''));

const getStyle = (data: any) => {
  return `color: ${data.color}; font-size: ${data.fontSize}; padding: ${data.padding}; transform: ${data.transform}`;
};
</script>

<style lang="scss" scoped>
.ValidCode {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.ValidCode span {
  display: inline-block;
}
</style>
