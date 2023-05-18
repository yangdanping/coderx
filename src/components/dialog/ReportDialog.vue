<template>
  <el-dialog v-model="dialogShow" @closed="closed" title="举报内容" width="30%" append-to-body destroy-on-close center>
    <el-checkbox-group v-model="reportOptions">
      <el-checkbox v-for="item in reportList" :label="item" :key="item"></el-checkbox>
    </el-checkbox-group>
    <el-input v-model="otherReport" placeholder="其他违规信息" maxlength="10" show-word-limit style="width: 50%; margin-top: 30px" />
    <template #footer>
      <el-button @click="cancelReport">取 消</el-button>
      <el-button type="primary" @click="submitReport">提 交</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const dialogShow = computed({
  get: () => props.show,
  set: (val) => emit('update:dialogVisible', val)
});

const reportOptions = ref<any[]>([]);
const reportList = ref(['垃圾广告', '辱骂攻击', '涉嫌违法犯罪', '时政信息不实']);
const otherReport = ref('');

const emit = defineEmits(['submit', 'cancel', 'update:dialogVisible']);

const submitReport = () => {
  emit('submit', {
    reportOptions: reportOptions.value,
    otherReport: otherReport.value
  });
};
const cancelReport = () => emit('cancel');
const closed = () => {
  reportOptions.value = [];
  otherReport.value = '';
};
</script>

<style lang="scss" scoped></style>
