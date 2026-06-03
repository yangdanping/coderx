<template>
  <div ref="panelRef" class="profile-panel">
    <header class="profile-panel__header">
      <h2>编辑资料</h2>
    </header>

    <el-form ref="profileFormRef" :model="form" :rules="rules" label-width="72px" status-icon class="profile-form profile-form--compact">
      <el-form-item label="性别" prop="sex">
        <div class="gender-select" role="group" aria-label="选择性别">
          <button
            v-for="option in genderOptions"
            :key="option.value"
            type="button"
            :class="['gender-option', `gender-option--${option.tone}`, { active: form.sex === option.value }]"
            :aria-pressed="form.sex === option.value"
            :data-test="option.testId"
            @click="selectGender(option.value)"
          >
            <component :is="option.icon" class="gender-option__icon" :stroke-width="2.4" aria-hidden="true" />
            <span>{{ option.label }}</span>
          </button>
        </div>
      </el-form-item>

      <div class="form-stack">
        <el-form-item label="年龄" prop="age">
          <el-input
            v-model="form.age"
            data-test="profile-age"
            name="profile-age"
            type="number"
            placeholder="例如 23…"
            inputmode="numeric"
            autocomplete="off"
            clearable
          />
        </el-form-item>

        <el-form-item label="职业" prop="career">
          <el-select
            v-model="form.career"
            data-test="profile-career"
            name="profile-career"
            placeholder="请选择职业…"
            autocomplete="off"
            clearable
            class="full-width"
          >
            <el-option v-for="item in careerOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model.trim="form.email"
            data-test="profile-email"
            name="profile-email"
            type="email"
            placeholder="例如 name@example.com…"
            autocomplete="off"
            spellcheck="false"
            clearable
          />
        </el-form-item>

        <el-form-item label="所在地" prop="address">
          <el-cascader
            v-model="selectedOptions"
            :options="provinceAndCityData as any"
            data-test="profile-address"
            name="profile-address"
            placeholder="请选择省市…"
            autocomplete="off"
            clearable
            filterable
            class="full-width"
            @change="handleAddressChange"
          />
        </el-form-item>
      </div>

      <div class="profile-actions">
        <el-button type="primary" data-test="profile-submit" :loading="submitting" @click="submit">保存</el-button>
      </div>

      <p class="sr-only" aria-live="polite">{{ formStatus }}</p>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { provinceAndCityData, codeToText } from 'element-china-area-data';
import type { FormInstance, FormItemRule, FormRules } from 'element-plus';
import { Mars, Venus } from 'lucide-vue-next';
import useUserStore from '@/stores/user.store';
import type { IUserInfo } from '@/stores/types/user.result';

type GenderValue = '男' | '女';

interface ProfileFormModel {
  sex: GenderValue;
  age: number | string | null;
  email: string;
  career: string;
  address: string;
}

const props = withDefaults(
  defineProps<{
    editForm?: IUserInfo;
  }>(),
  {
    editForm: () => ({}),
  },
);

const userStore = useUserStore();
const panelRef = ref<HTMLElement>();
const profileFormRef = ref<FormInstance>();
const selectedOptions = ref<Array<string | number>>([]);
const submitting = ref(false);
const formStatus = ref('');

const careerOptions = ['自由职业者', '前端', '后端', 'UI设计', '运维', '测试', '产品经理'];
const genderOptions = [
  { label: '男', value: '男' as const, icon: Mars, tone: 'male', testId: 'profile-gender-male' },
  { label: '女', value: '女' as const, icon: Venus, tone: 'female', testId: 'profile-gender-female' },
];

const createFormModel = (editForm: IUserInfo = {}): ProfileFormModel => ({
  sex: editForm.sex === '女' ? '女' : '男',
  age: editForm.age ?? null,
  email: editForm.email ?? '',
  career: editForm.career ?? '',
  address: editForm.address ?? '',
});

const form = ref<ProfileFormModel>(createFormModel(props.editForm));

const validateSex: FormItemRule['validator'] = (_rule, value, callback) => {
  if (value === '男' || value === '女') {
    callback();
    return;
  }

  callback(new Error('请选择性别'));
};

const validateCareer: FormItemRule['validator'] = (_rule, value, callback) => {
  if (!value || careerOptions.includes(value)) {
    callback();
    return;
  }

  callback(new Error('请选择正确的职业'));
};

const validateAge: FormItemRule['validator'] = (_rule, value, callback) => {
  if (value === null || value === undefined || value === '') {
    callback();
    return;
  }

  const age = Number(value);
  if (Number.isInteger(age) && age >= 1 && age <= 120) {
    callback();
    return;
  }

  callback(new Error('年龄需为 1-120 的整数'));
};

const validateEmail: FormItemRule['validator'] = (_rule, value, callback) => {
  if (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    callback();
    return;
  }

  callback(new Error('请输入正确的邮箱'));
};

const validateAddress: FormItemRule['validator'] = (_rule, value, callback) => {
  if (!value || String(value).trim().split(/\s+/).length >= 2) {
    callback();
    return;
  }

  callback(new Error('请选择省市'));
};

const rules: FormRules<ProfileFormModel> = {
  sex: [{ validator: validateSex, trigger: 'change' }],
  career: [{ validator: validateCareer, trigger: 'change' }],
  age: [{ validator: validateAge, trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  address: [{ validator: validateAddress, trigger: 'change' }],
};

const resolveAddressCodes = (address?: string) => {
  if (!address) return [];

  const [province, city] = address.split(/\s+/);
  const provinceItem = provinceAndCityData.find((item) => item.label === province);
  const cityItem = provinceItem?.children?.find((item) => item.label === city);

  return provinceItem && cityItem ? [provinceItem.value, cityItem.value] : [];
};

watch(
  () => props.editForm,
  (editForm) => {
    form.value = createFormModel(editForm);
    selectedOptions.value = resolveAddressCodes(form.value.address);
  },
  { immediate: true, deep: true },
);

const selectGender = (value: GenderValue) => {
  form.value.sex = value;
  void profileFormRef.value?.validateField('sex');
};

const handleAddressChange = (value: Array<string | number>) => {
  if (!value.length) {
    form.value.address = '';
    return;
  }

  const [provinceCode, cityCode] = value;
  const province = codeToText[provinceCode];
  const city = codeToText[cityCode];

  form.value.address = province && city ? `${province} ${city}` : '';
};

const createProfilePayload = (model: ProfileFormModel) => {
  const payload: Partial<IUserInfo> = {
    sex: model.sex,
  };

  const age = Number(model.age);
  if (model.age !== null && model.age !== '' && Number.isInteger(age)) payload.age = age;
  if (model.email.trim()) payload.email = model.email.trim();
  if (model.career) payload.career = model.career;
  if (model.address) payload.address = model.address;

  return payload;
};

const focusFirstInvalidField = async () => {
  await nextTick();

  const firstInvalid = panelRef.value?.querySelector<HTMLElement>('.el-form-item.is-error input, .el-form-item.is-error button, .el-form-item.is-error [tabindex]');
  firstInvalid?.focus();
};

const submit = async () => {
  const isValid = await profileFormRef.value?.validate().catch(() => false);
  if (!isValid) {
    formStatus.value = '请检查表单错误';
    await focusFirstInvalidField();
    return;
  }

  submitting.value = true;
  formStatus.value = '正在保存资料…';

  try {
    await userStore.updateProfileAction(createProfilePayload(form.value));
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.profile-panel {
  width: 100%;
}

.profile-panel__header {
  margin-bottom: 20px;
  text-align: center;

  h2 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 24px;
    font-weight: 700;
    text-wrap: balance;
  }
}

.profile-form {
  width: min(360px, 100%);
  margin: 0 auto;

  :deep(.el-form-item__content) {
    min-width: 0;
  }
}

.form-stack {
  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-cascader) {
    width: 100%;
  }
}

.gender-select {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  width: fit-content;
}

.gender-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 78px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  span {
    font-size: 15px;
    font-weight: 600;
  }

  .gender-option__icon {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
  }

  &:hover {
    border-color: var(--el-color-primary-light-3);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
  }

  &.gender-option--male {
    .gender-option__icon {
      color: #409eff;
    }

    &:hover,
    &.active {
      border-color: #409eff;
    }

    &.active {
      background: rgba(64, 158, 255, 0.12);
      box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.45);
    }
  }

  &.gender-option--female {
    .gender-option__icon {
      color: #f56c6c;
    }

    &:hover,
    &.active {
      border-color: #f56c6c;
    }

    &.active {
      background: rgba(245, 108, 108, 0.12);
      box-shadow: 0 0 0 1px rgba(245, 108, 108, 0.45);
    }
  }
}

.form-stack {
  display: grid;
  grid-template-columns: 1fr;
}

.full-width {
  width: 100%;
}

.profile-actions {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gender-option {
    transition: none;

    &:hover {
      transform: none;
    }
  }
}

@media (max-width: 768px) {
  .profile-form {
    width: 100%;
  }

  .profile-actions {
    justify-content: center;
  }
}
</style>
