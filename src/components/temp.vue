<template>
    <div>
      <input type="file" webkitdirectory directory multiple @change="handleFolderSelect" />
      <pre>{{ jsonObjects }}</pre>
    </div>
</template>
  
  <script>
  export default {
    data() {
      return {
        jsonObjects: []
      };
    },
    methods: {
      async handleFolderSelect(event) {
        const files = event.target.files;
        const fileMap = {};
  
        // 读取文件内容并组织到 fileMap 中
        for (let file of files) {
          const filePath = file.webkitRelativePath;
          const parts = filePath.split('/');
          const folderName = parts[0];
          const fileName = parts[1];
  
          if (!fileMap[folderName]) {
            fileMap[folderName] = {};
          }
  
          if (fileName === 'information.json') {
            fileMap[folderName]['information.json'] = await this.readFileAsText(file);
          } else if (fileName === 'data_processing.js') {
            fileMap[folderName]['data_processing.js'] = await this.readFileAsText(file);
          } else if (fileName === 'visualization.js') {
            fileMap[folderName]['visualization.js'] = await this.readFileAsText(file);
          }
        }
  
        // 转换为 JSON 对象列表
        const jsonObjects = Object.keys(fileMap).map(folderName => {
          const files = fileMap[folderName];
          const info = JSON.parse(files['information.json']);
  
          return {
            name: folderName,
            describe: info.describe,
            match_tasks: info.match_tasks,
            template: info.template,
            example: info.example,
            variants: info.variants,
            circumstances: info.circumstances,
            type: info.type,
            explanation: info.explanation,
            data_processing_code: files['data_processing.js'],
            visualization_code: files['visualization.js']
          };
        });
  
        this.jsonObjects = jsonObjects;
      },
      readFileAsText(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
    }
  };
  </script>
  