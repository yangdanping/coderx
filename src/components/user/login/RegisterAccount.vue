<template>
  <div class="register-account">
    <el-form :rules="rules" :model="form" status-icon ref="registerForm" label-width="100px">
      <el-form-item label="用户名" prop="name">
        <el-input v-model.trim="form.name" @keyup.enter="focusNext1" :prefix-icon="User" clearable></el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model.trim="form.password" clearable show-password ref="nextRef1" @keyup.enter="focusNext2" type="password" :prefix-icon="Lock"></el-input>
      </el-form-item>
      <el-form-item label="确认密码" prop="confirm">
        <el-input v-model.trim="form.confirm" clearable show-password ref="nextRef2" @keyup.enter="register" type="password" :prefix-icon="Lock"></el-input>
      </el-form-item>
      <el-form-item class="btn-box">
        <el-button type="primary" @click="register">注册并登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue';
import useUserStore from '@/stores/user';
import type { ElForm, ElInput } from 'element-plus';
import { Msg } from '@/utils';
import { User, Lock } from '@element-plus/icons-vue';

const userStore = useUserStore();

const registerForm = ref<InstanceType<typeof ElForm>>();
const nextRef1 = ref<InstanceType<typeof ElInput>>();
const nextRef2 = ref<InstanceType<typeof ElInput>>();

const form = reactive({ name: '', password: '', confirm: '' });
const rules = ref({
  name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirm: [{ required: true, message: '请输入密码', trigger: 'blur' }]
});

const register = () => {
  registerForm.value?.validate((valid) => {
    const { name, password, confirm } = form;
    if (valid) {
      password === confirm ? userStore.registerAction({ name, password }) : Msg.showFail('两次密码输入不一致');
      // password === confirm ? Msg.showSuccess(`${name},${password}`) : Msg.showFail('两次密码输入不一致');
    } else {
      Msg.showFail('请输入正确的用户名和密码');
    }
  });
};

const focusNext1 = () => nextRef1.value?.focus();
const focusNext2 = () => nextRef2.value?.focus();
</script>

<style lang="scss" scoped>
.register-account {
  margin-top: 40px;
  .el-form {
    .el-input {
      width: 100%;
    }
    .el-form-item {
      margin-bottom: 30px;
    }
    :deep(.el-form-item__label) {
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
  }
}
</style>
