<template>
  <div class="register-account">
    <el-form :rules="rules" :model="form" status-icon ref="registerForm">
      <el-form-item prop="name">
        <el-input v-model.trim="form.name" placeholder="用户名" @keyup.enter="focusNext1" clearable>
          <template #prefix>
            <User :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input v-model.trim="form.password" placeholder="密码" clearable show-password ref="nextRef1" @keyup.enter="focusNext2" type="password">
          <template #prefix>
            <Lock :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="confirm">
        <el-input v-model.trim="form.confirm" placeholder="确认密码" clearable show-password ref="nextRef2" @keyup.enter="register" type="password">
          <template #prefix>
            <ShieldCheck :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item class="btn-box">
        <el-button class="register-btn" @click="register">注册</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { Msg } from '@/utils';
import { User, Lock, ShieldCheck } from 'lucide-vue-next';

import type { ElForm, ElInput } from 'element-plus';

import useUserStore from '@/stores/user.store';
const userStore = useUserStore();

const registerForm = ref<InstanceType<typeof ElForm>>();
const nextRef1 = ref<InstanceType<typeof ElInput>>();
const nextRef2 = ref<InstanceType<typeof ElInput>>();

const form = reactive({ name: '', password: '', confirm: '' });
const rules = ref({
  name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirm: [{ required: true, message: '请输入密码', trigger: 'blur' }],
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
$height: 42px;
.register-account {
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

      .register-btn {
        width: 100%;
        height: $height;
        background: #409eff;
        color: #ffffff;
        border: none;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.5px;
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
