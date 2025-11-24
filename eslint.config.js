import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'build', 'node_modules', 'public', 'stats.html', 'auto-imports.d.ts', 'components.d.ts', '.DS_Store', '.env.*'],
  },

  // 扩展推荐配置
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  // 通用配置
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Auto-imports
        ref: 'readonly',
        reactive: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        onUpdated: 'readonly',
        onBeforeUpdate: 'readonly',
        nextTick: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
        useRouter: 'readonly',
        useRoute: 'readonly',
        storeToRefs: 'readonly',
        defineStore: 'readonly',
        shallowRef: 'readonly',
        unref: 'readonly',
        toRef: 'readonly',
        toRefs: 'readonly',
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // 针对 TypeScript 文件的特定配置
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.vue'],
    rules: {
      // TypeScript 编译会检查未定义变量，关闭 ESLint 的检查以避免误报 (特别是对于 auto-import)
      'no-undef': 'off',

      // 降低 no-unused-expressions 的严格程度，允许短路求值等常见模式
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],

      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-setup-props-destructure': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/comma-dangle': 'off',
      // 允许非空断言可选链
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    },
  },

  // 配置文件自身的规则
  {
    files: ['eslint.config.js', 'vite.config.ts'],
    rules: {
      'no-undef': 'off', // 配置文件中允许 node 全局变量
    },
  },

  // Prettier 配置放最后
  eslintConfigPrettier,
);
