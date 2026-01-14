<template>
  <div class="login-account">
    <el-form :rules="rules" :model="loginForm" status-icon ref="loginFormRef">
      <el-form-item prop="name">
        <el-input v-model.trim="loginForm.name" placeholder="用户名" @keyup.enter="focusNext" clearable>
          <template #prefix>
            <User :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input v-model.trim="loginForm.password" ref="nextRef" type="password" placeholder="密码" @keyup.enter="login" clearable show-password>
          <template #prefix>
            <Lock :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item class="btn-box">
        <el-button class="login-btn" @click="login">登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { Msg } from '@/utils';
import { User, Lock } from 'lucide-vue-next';

import type { ElForm, ElInput } from 'element-plus';

import useUserStore from '@/stores/user.store';
const userStore = useUserStore();

const loginFormRef = ref<InstanceType<typeof ElForm>>();
const nextRef = ref<InstanceType<typeof ElInput>>();
const loginForm = reactive({ name: '', password: '' });
const rules = {
  name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
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
</script>

<style lang="scss" scoped>
$height: 42px;
.login-account {
  :deep(.el-form) {
    .el-form-item {
      margin-bottom: 24px;
    }

    // 移除 label 样式
    .el-form-item__label {
      display: none;
    }

    .el-input {
      width: 100%;
      height: $height;

      .el-input__wrapper {
        border: 1px solid #e0e0e0;
        padding: 10px 14px;
        box-shadow: none;

        &.is-focus {
          background-color: #fff;
          border-color: #409eff;
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
        }
      }

      .el-input__inner {
        color: #2c3e50;
        font-size: 15px;
        font-weight: 400;

        &::placeholder {
          color: #909399;
          font-weight: 400;
        }
      }

      // 清除和密码显示图标样式
      .el-input__suffix {
        .el-input__icon {
          color: #909399;
          font-size: 16px;
        }
      }

      .el-input__prefix {
        color: #909399;
        display: flex;
        align-items: center;
      }
    }

    // 按钮样式 - 与 input 统一
    .btn-box {
      margin-top: 24px;
      margin-bottom: 0;

      .login-btn {
        width: 100%;
        height: $height;
        background: #409eff;
        color: #fff;
        border: none;
        font-size: 20px;
        letter-spacing: 2px;
        transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);

        &:hover {
          background: #66b1ff;
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(64, 158, 255, 0.2);
        }
      }
    }
  }
}
</style>
