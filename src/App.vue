<template>
  <div class="app-container">
    <AppHeader/>
    <div class="main-container">
      <div class="left-container">
        <ChatBox ref="chatBox" :messages="messages" @new-message="addMessage"/>
        <div v-if="messages.length === 0" class="initial-content">
          <img src="@/assets/logo-lab.png" alt="Logo" class="logo"/>
          <div class="preset-questions">
            <el-button
                v-for="(question, index) in presetQuestions"
                :key="index"
                @click="askPresetQuestion(question)"
                class="preset-question-button"
            >
              {{ question }}
            </el-button>
          </div>
        </div>
      </div>
      <div class="right-container">
        <el-button class="clear-button" @click="clearAllSelections">清除所有选中项</el-button>
        <el-button class="download-button" :disabled="activeTab !== 'preview'" @click="downloadAllCharts">生成报告
        </el-button>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="列表模式" name="list">
            <div class="list-mode" v-if="activeTab === 'list'">
              <el-checkbox-group>
                <ListItem
                    v-for="(item, index) in listItems"
                    :key="index"
                    :item="item"
                    :ref="`listItem-${index}`"
                    @update-selected="updateSelected(index, $event)"
                    @set-message="setMessageAndFocus"
                />
              </el-checkbox-group>
            </div>
          </el-tab-pane>
          <el-tab-pane label="预览模式" name="preview">
            <div class="preview-mode" v-if="activeTab === 'preview'" ref="previewMode">
              <PreviewItem
                  v-for="(item, index) in previewItems"
                  :key="index"
                  :item="item"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script>
import AppHeader from './components/AppHeader.vue'
import ChatBox from './components/ChatBox.vue'
import ListItem from './components/ListItem.vue'
import PreviewItem from "@/components/PreviewItem.vue";
import {idbKeyval} from "@/agents/db";
import {saveAs} from 'file-saver';
import {toPng} from 'html-to-image';
import htmlDocx from 'html-docx-js/dist/html-docx';


export default {
  components: {
    PreviewItem,
    AppHeader,
    ChatBox,
    ListItem
  },
  data() {
    return {
      messages: [], // 初始没有对话
      presetQuestions: [
        '中美近十年论文量对比',
        '地理图表展示国家间论文数量分布',
        '各作者之间的合作是什么样的？',
        '可视化学术论文的引用网络'
      ],
      activeTab: 'list',
      listItems: [],
      sourceData: null
    }
  },
  provide() {
    return {
      getSourceData: () => this.sourceData
    };
  },
  computed: {
    previewItems() {
      // 获取所有被选中的items
      return this.listItems.filter(item => item.isSelected);
    }
  },
  methods: {
    updateSelected(index, isSelected) {
      this.listItems[index].isSelected = isSelected;
    },
    addMessage(message) {
      this.messages.push(message);
    },
    askPresetQuestion(question) {
      this.$refs.chatBox.setMessageAndSend(question);
    },
    async updateListItems(visualizationSpec, processedData, modify=false) {
      try {
        if (!this.sourceData) {
          this.sourceData = await idbKeyval.get('sourceData');
        }
        const titles = await idbKeyval.get('previousQuestions');
        if (modify){
          this.listItems.pop();
        }
        if (visualizationSpec && processedData) {
          const type = visualizationSpec.type;
          let spec = visualizationSpec.vlSpec, width_vega;

          if (type === 'vega') {
            spec = spec.replace(/<([^>]+)>/g, function(match, expression) {
                try {
                    // 使用eval执行表达式并返回结果
                    let result = eval(expression);
                    return typeof result === 'string' ? result : JSON.stringify(result);
                } catch (e) {
                    console.error("Error evaluating expression: ", expression, e);
                    return match;  // 发生错误时替换为空字符串
                }
            });
            console.log('替换后的spec:\n' + spec)
            spec = JSON.parse(spec);
            spec = {
              ...spec,
            };
            width_vega = {
              ...spec,
              //width: 800,
              //height: 400
            };
            console.log('处理后的spec：\n' + JSON.stringify(width_vega));
          } else {
            spec = new Function(spec)();
          }

          await idbKeyval.set(`${this.listItems.length}`, processedData);

          this.listItems.push({
            spec: type === 'vega' ? width_vega : spec,
            type: type,
            keymap: `${this.listItems.length}`,
            fun: await idbKeyval.get('dataProcessingCode'),
            title: titles[titles.length - 1],
            description: '等待解释生成中',
            isSelected: false
          });
          await new Promise((resolve, reject) => {
            this.$nextTick(async () => {
              try{
                // 遍历 $refs 获取所有 ListItem 的 ref 名
                Object.keys(this.$refs).forEach(refName => {
                  if (refName.includes('listItem')) {
                    console.log(`ListItem ref name: ${refName}`);
                  }
                });
                // 使用refs访问ListItem实例
                const refKey = `listItem-${this.listItems.length - 1}`;
                const listItemRef = Array.isArray(this.$refs[refKey]) ? this.$refs[refKey][0] : this.$refs[refKey];
                console.log('listItemRef:', listItemRef);
                if (listItemRef) {
                    // 获取对象的所有可用方法
                    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(listItemRef))
                                          .filter(prop => typeof listItemRef[prop] === 'function');
                
                    // 打印方法名
                    console.log('Available methods:', methods);
                } else {
                    console.log('Reference not found.');
                }
                if (listItemRef && typeof listItemRef.renderChart === 'function') {
                  await listItemRef.renderChart();
                  console.log('测试渲染成功')
                  if (type === 'vega'){
                    await idbKeyval.set('completed_vlSpec', width_vega);
                  }
                } else {
                  throw new Error('renderChart 方法未定义或不可用');
                }
                resolve();
              } catch (error) {
                  reject(error);
              }
            });
          });
        }
      } catch (error) {
        // 如果发生错误，删除 listItems 中最后一个元素
        this.listItems.pop();
        console.error('Error in updateListItems:', error);
        // 抛出错误，供调用方捕获处理
        throw error;
      }
    },
    async updateDescription() {
      const explanation = await idbKeyval.get('explanation');
      const listIndex = this.listItems.length - 1;
      this.listItems[listIndex].description = explanation;
    },
    clearAllSelections() {
      // 清除所有选中项
      this.activeTab = 'list';
      this.listItems.forEach(item => {
        item.isSelected = false;
      });
    },
    async downloadAllCharts() {
      const previewItems = this.$refs.previewMode.querySelectorAll('.preview-item');
      const items = [];

      for (const previewItem of previewItems) {
        const chartContainer = previewItem.querySelector('.chart-container');
        const imageData = await toPng(chartContainer);
        const img = new Image();
        img.src = imageData;

        // 等待图片加载完成以获取其宽高
        await new Promise((resolve) => {
          img.onload = () => {
            resolve();
          };
        });

        // 获取原始宽高比例
        const originalWidth = img.width;
        const originalHeight = img.height;
        const scale = 630 / originalWidth;  // 缩放比例
        const scaledWidth = 630;
        const scaledHeight = originalHeight * scale;

        const description = previewItem.querySelector('.item-description').innerText;
        const formattedDescription = description
            .replace('可视编码解释：', '<b>可视编码解释：</b>')
            .replace('结论和见解：', '<br/><br/><b>结论和见解：</b>');
        items.push({
          image: imageData,
          width: scaledWidth,
          height: scaledHeight,
          description: formattedDescription,
        });
      }

      let htmlContent = `
      <h1 style="text-align: center;">文献可视化报告</h1>
    `;
      items.forEach(item => {
        htmlContent += `
        <div style="text-align: center;">
          <img src="${item.image}" alt="Chart Image" width="${item.width}" height="${item.height}" />
        </div>
        <p>${item.description}</p>
        <br/><br/>
      `;
      });

      const converted = htmlDocx.asBlob(htmlContent);
      saveAs(converted, '文献可视化报告.docx');
    },
    setMessageAndFocus(message) {
      this.$refs.chatBox.newMessage = message;
      this.$refs.chatBox.$el.querySelector('.el-textarea__inner').focus();
    },
  }
}
</script>

<style>
html, body {
  overflow: hidden; /* 禁用全局滚动 */
  height: 100%;
  margin: 0;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* 禁止全局滚动 */
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden; /* 禁止全局滚动 */
}

.left-container {
  flex: 1; /* 占1/3的宽度 */
  border: 10px solid #f7f7f7;
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.right-container {
  flex: 2; /* 占2/3的宽度 */
  padding: 10px;
  overflow-y: auto; /* 右侧区域独立滚动 */
  border: 20px solid #f7f7f7; /* 增加边框 */
  background-color: #f9f9f9;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* 增加阴影边框 */
  position: relative;
}

.clear-button {
  position: absolute;
  top: 10px;
  right: 105px;
  z-index: 10;
  padding: 10px 20px;
  background-color: #409EFF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.initial-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.logo {
  width: 150px;
  height: 150px;
  margin-bottom: 20px;
  margin-left: 20px;
}

.preset-questions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.preset-question-button {
  width: 250px;
  height: 40px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  justify-content: center; /* 确保文本居中对齐 */
  align-items: center; /* 确保文本居中对齐 */
}

.custom-tabs /deep/ .el-tabs__item {
  font-size: 50px; /* 调整Tab字体大小 */
  font-weight: bold;
}

.grid-mode {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: flex-start;
  align-items: flex-start;
}

.list-mode {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-mode {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.download-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  padding: 10px 20px;
  background-color: #409EFF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}
</style>
