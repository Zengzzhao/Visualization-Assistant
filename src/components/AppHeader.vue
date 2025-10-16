<template>
  <el-header class="header">
    <div class="left-section">
      <img alt="校徽" src="../assets/logo.png" class="logo_cuc">
      <span class="title">文献可视化分析助手</span>
    </div>
    <div class="right-section">
      <input type="file" ref="fileInput" webkitdirectory directory multiple @change="handleFiles" style="display: none;"/>
      <el-button type="primary" @click="importTemplate">导入模板库</el-button>
      <input type="file" ref="jsonFileInput" style="display: none" @change="handleFileUpload" />
      <el-button
        :loading="isLoading"
        @click="uploadJson"
        class="upload-button"
        style="margin-left: 20px"
      >
        上传JSON
      </el-button>
      <el-button @click="refreshPage" class="refresh-button">刷新界面</el-button>
      <div v-if="templatesNum > 0">已加载模板个数: {{ templatesNum }}</div>
    </div>
  </el-header>
</template>


<script>
import {idbKeyval} from "@/agents/db";

export default {
  name: 'AppHeader',
  data() {
    return {
      isLoading: false, // 控制加载状态的变量
      templatesNum: 0,
    };
  },
  async created() {
    try {
      const templates = await idbKeyval.get('templates');
      this.templatesNum = templates ? templates.length : 0;
    } catch (error) {
      console.error('Error loading templates:', error);
      this.templatesNum = 0;
    }
  },
  methods: {
    importTemplate() {
      this.$refs.fileInput.click(); // 触发隐藏的文件输入框
    },
    async handleFiles(event) {
      const files = event.target.files;
      const folderFiles = {};
      
      // 将文件按文件夹分组
      for (const file of files) {
        const path = file.webkitRelativePath.split('/');
        const folderName = path[path.length - 2];
        const fileName = path[path.length - 1];
        if (!folderFiles[folderName]) {
          folderFiles[folderName] = {};
        }
        folderFiles[folderName][fileName] = file;
      }
      console.log(folderFiles)

      // 处理每个文件夹
      const database = [];
      for (const folderName in folderFiles) {
        const files = folderFiles[folderName];
        const infoFile = files['information.json'];
        const dataProcessingFile = files['data_processing.js'];
        const visualizationFile = files['visualization.js'];

        if (infoFile && dataProcessingFile && visualizationFile) {
          // 读取 information.json 文件
          const infoContent = await this.readFile(infoFile);
          const info = JSON.parse(infoContent);

          // 读取 data_processing.js 文件
          const dataProcessingCode = await this.readFile(dataProcessingFile);

          // 读取 visualization.js 文件
          const visualizationCode = await this.readFile(visualizationFile);

          // 构建对象并添加到数据库
          const entry = {
            name: folderName,
            describe: info.describe,
            match_tasks: info.match_tasks,
            template: info.template,
            example: info.example,
            variants: info.variants,
            circumstances: info.circumstances,
            type: info.type,
            explanation: info.explanation,
            data_processing_code: dataProcessingCode,
            visualization_code: visualizationCode
          };

          database.push(entry);
        }
      }
      idbKeyval.set('templates', database).then(() => {
          console.log('Templates has been saved to IndexedDB');
      });
      this.templatesNum = database.length;
      //this.templatesNum = database.length;
      console.log(database)
    },
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    },
    uploadJson() {
      this.isLoading = true; // 开始上传前设置为加载状态
      this.$refs.jsonFileInput.click();
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const sourceData = JSON.parse(e.target.result);
          idbKeyval.set('sourceData', sourceData).then(() => {
            console.log('sourceData has been saved to IndexedDB');
            this.isLoading = false; // 数据保存成功后关闭加载状态
          }).catch((error) => {
            console.error('Error saving to IndexedDB:', error);
            this.isLoading = false; // 出现错误时也关闭加载状态
          });
        };
        reader.readAsText(file);
      } else {
        alert('Please upload a valid JSON file.');
        this.isLoading = false; // 如果文件无效，关闭加载状态
      }
    },
    refreshPage() {
      window.location.reload();
    }
  }
}
</script>

<style scoped>

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
}

.left-section {
  margin-left: 5px;
  display: flex;
  align-items: center;
}

.logo_cuc {
  width: 40px;
  height: 40px;
  margin-right: 10px;
}

.title {
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 1px; /* 增加字间距 */
}

.right-section {
  display: flex;
  align-items: center;
}

.upload-button {
  margin-right: 10px;
}

.refresh-button {
  margin-right: 20px;
}
</style>
