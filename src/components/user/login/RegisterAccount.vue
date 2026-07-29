<template>
  <div class="register-account">
    <el-form :rules="rules" :model="form" status-icon ref="registerForm">
      <el-form-item prop="name">
        <el-input v-model.trim="form.name" placeholder="用户名" @keyup.enter="focusNickname" clearable>
          <template #prefix>
            <User :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="nickname">
        <el-input
          ref="nicknameInput"
          v-model="form.nickname"
          data-test="register-nickname"
          placeholder="昵称（可选）"
          :maxlength="NICKNAME_MAX_LENGTH"
          clearable
          @keyup.enter="focusPassword"
        >
          <template #prefix>
            <UserRound :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input ref="passwordInput" v-model.trim="form.password" placeholder="密码" clearable show-password @keyup.enter="focusConfirmation" type="password">
          <template #prefix>
            <Lock :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="confirm">
        <el-input ref="confirmationInput" v-model.trim="form.confirm" placeholder="确认密码" clearable show-password @keyup.enter="register" type="password">
          <template #prefix>
            <ShieldCheck :size="16" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item class="btn-box">
        <el-button class="register-btn" type="primary" plain @click="register">注册</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { Msg } from '@/utils';
import { NICKNAME_MAX_LENGTH, normalizeNickname, validateNickname } from '@/utils/nickname';
import { User, UserRound, Lock, ShieldCheck } from '@lucide/vue';
import useUserStore from '@/stores/user.store';

import type { ElForm, ElInput, FormItemRule } from 'element-plus';
const userStore = useUserStore();

const registerForm = ref<InstanceType<typeof ElForm>>();
const nicknameInput = ref<InstanceType<typeof ElInput>>();
const passwordInput = ref<InstanceType<typeof ElInput>>();
const confirmationInput = ref<InstanceType<typeof ElInput>>();

const form = reactive({ name: '', nickname: '', password: '', confirm: '' });

const validateNicknameRule: FormItemRule['validator'] = (_rule, value, callback) => {
  const message = validateNickname(value);
  message ? callback(new Error(message)) : callback();
};

const rules = ref({
  name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ validator: validateNicknameRule, trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirm: [{ required: true, message: '请输入密码', trigger: 'blur' }],
});

const register = () => {
  registerForm.value?.validate((valid) => {
    const { name, nickname, password, confirm } = form;
    if (valid) {
      password === confirm
        ? userStore.registerAction({ name, password, nickname: normalizeNickname(nickname) || null })
        : Msg.showFail('两次密码输入不一致');
      // password === confirm ? Msg.showSuccess(`${name},${password}`) : Msg.showFail('两次密码输入不一致');
    } else {
      Msg.showFail('请输入正确的用户名和密码');
    }
  });
};

const focusNickname = () => nicknameInput.value?.focus();
const focusPassword = () => passwordInput.value?.focus();
const focusConfirmation = () => confirmationInput.value?.focus();
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
        background-color: transparent;
        border: 1px solid var(--text-secondary);
        opacity: 0.8;
        padding: 10px 14px;
        box-shadow: none;
        transition: all 0.3s;

        &.is-focus {
          opacity: 1;
          background-color: var(--bg-color-primary);
          border-color: #409eff;
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
        }
      }

      .el-input__inner {
        color: var(--text-primary);
        font-size: 15px;
        font-weight: 400;

        &::placeholder {
          color: var(--text-secondary);
          font-weight: 400;
        }
      }

      // 清除和密码显示图标样式
      .el-input__suffix {
        .el-input__icon {
          color: var(--text-secondary);
          font-size: 16px;
        }
      }

      .el-input__prefix {
        color: var(--text-secondary);
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
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.5px;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }
  }
}
</style>
