<template>
  <div class="login-account">
    <el-form :rules="rules" :model="loginForm" status-icon ref="loginFormRef" label-width="90px">
      <el-form-item label="用户名" prop="name">
        <el-input v-model.trim="loginForm.name" ref="getFocus" @keyup.enter="focusNext" clearable></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model.trim="loginForm.password" ref="nextRef" type="password" @keyup.enter="login" clearable show-password></el-input>
      </el-form-item>
      <!-- <el-form-item>
        <div class="valid-code">
          <el-input prefix-icon="el-icon-key" v-model="loginForm.validCode" placeholder="请输入验证码"></el-input>
          <valid-code @input="createValidCode" />
        </div>
      </el-form-item> -->
      <el-form-item class="btn-box">
        <el-button type="primary" @click="login">登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import type { ElForm, ElInput } from 'element-plus';
// import ValidCode from '@/components/ValidCode.vue';
import useUserStore from '@/stores/user';
import { Msg } from '@/utils';
const userStore = useUserStore();
const loginFormRef = ref<InstanceType<typeof ElForm>>();
const getFocus = ref<InstanceType<typeof ElInput>>();
const nextRef = ref<InstanceType<typeof ElInput>>();

const loginForm = reactive({
  name: '',
  password: ''
});
const rules = {
  name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};
// 用户登录
const login = () => {
  const { name, password } = loginForm;
  console.log('login', { name, password });
  loginFormRef.value?.validate((valid) => {
    if (valid) {
      userStore.loginAction({ name, password });
    } else {
      Msg.showFail('请输入正确的用户名和密码');
    }
  });
};
// 回车聚焦
const focusNext = () => nextRef.value?.focus();

onMounted(() => {
  nextTick(() => {
    getFocus.value?.focus();
  });
});
</script>

<style lang="scss" scoped>
.login-account {
  margin-top: 40px;
  :deep(.el-form) {
    .el-form-item {
      margin-bottom: 40px;
    }
    .el-form-item__label {
      font-size: 17px;
    }
    .btn-box {
      position: relative;
      .el-button {
        position: absolute;
        width: 60%;
        left: 50%;
        transform: translateX(-50%);
      }
    }

    .valid-code {
      display: flex;
      justify-content: space-around;
      .el-input {
        width: 50%;
      }
    }
  }
}
</style>
