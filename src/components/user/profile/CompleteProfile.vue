<template>
  <div class="complete-info">
    <div v-if="active === 0" class="sex-info">
      <h2>您的性别</h2>
      <div class="sex-select">
        <div @click="handleSelect('男')" class="sex" :class="{ active: form.sex === '男' }">
          <h1>男</h1>
          <img src="~@/assets/img/user/male.svg" alt="" />
        </div>
        <div @click="handleSelect('女')" class="sex" :class="{ active: form.sex === '女' }">
          <h1>女</h1>
          <img src="~@/assets/img/user/female.svg" alt="" />
        </div>
      </div>
    </div>
    <div v-else-if="active === 1" class="career-info">
      <h2>您的职业</h2>
      <el-select v-model="form.career" placeholder="请选择" clearable>
        <el-option v-for="item in career" :key="item" :label="item" :value="item"> </el-option>
      </el-select>
    </div>
    <div v-else="active === 2" class="more-info">
      <h2>更多信息</h2>
      <el-form :rules="rules" :model="form" status-icon ref="infoForm" label-width="90px">
        <el-form-item label="年龄" prop="age">
          <el-input v-model.number="form.age" clearable></el-input>
        </el-form-item>
        <el-form-item label="email" prop="email">
          <el-input v-model.trim="form.email" clearable></el-input>
        </el-form-item>
        <el-form-item label="address" prop="address">
          <el-cascader :options="areaSelectData" @change="handleChange" class="full-width" size="large" v-model="selectedOptions" placeholder="请选择您所在的城市" />
        </el-form-item>
      </el-form>
    </div>
    <el-steps :active="active" finish-status="success">
      <el-step title="步骤 1"></el-step>
      <el-step title="步骤 2"></el-step>
      <el-step title="步骤 3"></el-step>
    </el-steps>
    <el-button style="margin-top: 12px" @click="next">{{ active < 2 ? '下一步' : '完成' }}</el-button>
  </div>
</template>

<script>
import { provinceAndCityData, CodeToText, TextToCode } from 'element-china-area-data'; // 地址级联选择器
export default {
  name: 'CompleteProfile',
  props: {
    editForm: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      active: 0,
      career: ['自由职业者', '前端', '后端', 'UI设计', '运维', '测试', '产品经理'],
      areaSelectData: provinceAndCityData, // options绑定的数据就是引入的 provinceAndCityData
      selectedOptions: [], // 地区选择参数,['省区域码', '市区域码']
      form: {
        sex: '男',
        age: null,
        email: null,
        career: null,
        address: null
      },
      rules: {
        age: [{ pattern: /^(?:[1-9][0-9]?|1[01][0-9]|120)$/, message: '请输入正确的年龄', trigger: 'blur' }],
        email: [{ pattern: /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/, message: '请输入正确的邮箱格式', trigger: 'blur' }]
      }
    };
  },
  mounted() {
    if (this.editForm !== {}) {
      let { sex, age, email, career, address } = this.editForm;
      address && this.formatCity(address.split(' ')[0], address.split(' ')[1]);
      this.form = { sex, age, email, career, address };
      console.log(this.form);
    }
  },
  components: {},
  computed: {},
  methods: {
    handleSelect(value) {
      this.form.sex = value;
      console.log(this.form.sex);
    },
    handleChange() {
      var provinceCode = this.selectedOptions[0];
      var cityCode = this.selectedOptions[1];
      // CodeToText属性是区域码,属性值是汉字 CodeToText['110000']输出北京市
      this.form.address = `${CodeToText[provinceCode]}` + ` ${CodeToText[cityCode]}`;
      console.log('选择的省市:', this.form.address);
    },
    // 获取到省市数据,进行格式化
    formatCity(province, city) {
      // TextToCode属性是汉字,属性值是区域码 TextToCode['北京市'].code输出110000
      var provinceCode = TextToCode[province].code; // 省份
      var cityCode = TextToCode[province][city].code; // 城市
      this.selectedOptions = [provinceCode, cityCode];
    },
    next() {
      if (this.active++ > 1) {
        Object.keys(this.form).forEach((key) => !this.form[key] && this.$delete(this.form, key));
        this.$store.dispatch('u/updateProfileAction', this.form);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.complete-info {
  width: 100%;
  display: flex;
  flex-direction: column;

  .sex-info,
  .career-info,
  .more-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .sex-select {
      display: flex;
      justify-content: space-around;
      width: 100%;
      margin: 40px 0;
      .sex {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 200px;
        // background: pink;
        border-radius: 10px;
        transition: all 0.3s;
        cursor: pointer;
      }
      .sex:hover {
        transform: scale(1.2);
        box-shadow: 2px 4px 20px #c8d0e7, 2px 4px 20px #fff;
      }
      .sex.active {
        transform: scale(1.2);
        box-shadow: 2px 4px 10px #5e86ff, 2px 4px 10px #fff;
      }
    }
  }
  .career-info {
    .el-select {
      margin: 40px 0;
    }
  }
}
</style>
