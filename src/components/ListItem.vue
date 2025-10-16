<template>
  <div class="list-item">
    <input v-model="checked" @click="toggleSelection" class="checkbox" type="checkbox">
    <div class="content-wrapper">
      <div class="header">
        <el-button @click="setMessage(item.title)" class="add-to-input-button">
          <img src="@/assets/copy.png" alt="Copy" class="copy-icon">
        </el-button>
      </div>
      <div :class="['chart-wrapper', { 'vega-chart': isVegaChart, 'd3-chart': isD3Chart }]" @click="toggleFullscreen">
        <div ref="chartContainer"
             :class="['chart-container', { 'vega-chart-container': isVegaChart, 'd3-chart-container': isD3Chart }]">
        </div>
      </div>
      <div class="item-content">
        <div class="item-description">
          <span v-for="(line, index) in splitDescription(item.description)" :key="index">{{ line }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import vegaEmbed from 'vega-embed'
import * as d3 from "d3";
import * as topojson from "topojson-client";
import seedrandom from "seedrandom";
import * as Papa from "papaparse";
import {voronoiTreemap} from "d3-voronoi-treemap";
import {jLouvain} from "jlouvain";
import ForceGraph3D from "3d-force-graph";
import cloud from "d3-cloud";
import {idbKeyval} from "@/agents/db";

export default {
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      checked: this.item.isSelected,
      isFullscreen: false
    }
  },
  watch: {
    checked(newVal) {
      this.$emit('update-selected', newVal);
    },
    'item.isSelected': {
      handler(newVal) {
        this.checked = newVal;
      },
      immediate: true
    }
  },
  computed: {
    isVegaChart() {
      return this.item.type === 'vega';
    },
    isD3Chart() {
      return this.item.type === 'd3';
    }
  },
  inject: ['getSourceData'],
  methods: {
    setMessage(message) {
      this.$emit('set-message', message);
    },
    toggleSelection() {
      this.checked = !this.checked;
    },
    async renderChart() {
      try{
        const container = this.$refs.chartContainer
        const containerWidth = container.clientWidth*0.8;
        const containerHeight = container.clientHeight*0.8;
        console.log(`width:${containerWidth}, height:${containerHeight}`)
        if (this.item.type === 'vega') {
          const spec = JSON.parse(JSON.stringify(this.item.spec));
          // 设置图表的宽度和高度
          spec.width = containerWidth;
          spec.height = containerHeight;
          vegaEmbed(container, spec).catch(console.error);
        } else if (this.item.type === 'd3') {
          // const sourceData = this.getSourceData();
          const data = await idbKeyval.get(`${this.item.keymap}`);
          this.item.spec(d3, data, container, containerWidth, containerHeight, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud);
        }
      } catch (error) {
        console.error('Error in renderChart:', error);
        throw error; // 或者根据需要处理错误
      }
    },
    async renderFullscreenChart() {
      const container = this.$refs.chartContainer;

      // 检查全屏状态下需要的宽度和高度
      const width = window.innerWidth * 2 / 3;
      const height = window.innerHeight * 2 / 3;

      if (this.item.type === 'vega') {
        const spec = JSON.parse(JSON.stringify(this.item.spec));

        // 更新 Vega 的宽度和高度使其充满屏幕
        spec.width = width;
        spec.height = height;

        try {
          await vegaEmbed(container, spec);
        } catch (error) {
          console.error('Error rendering Vega chart in fullscreen:', error);
        }
      } else if (this.item.type === 'd3') {
        try {
          const data = await idbKeyval.get(`${this.item.keymap}`);

          // 使用全屏容器的宽度和高度渲染D3图表
          this.item.spec(d3, data, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud);
        } catch (error) {
          console.error('Error rendering D3 chart in fullscreen:', error);
        }
      }
    },toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
      const container = this.$refs.chartContainer;
        
      if (this.isFullscreen) {
        // 添加全屏类
        container.classList.add('fullscreen');
        container.classList.add('chart-fullscreen-container');
        container.innerHTML = '';
        this.renderFullscreenChart();
      } else {
        // 移除全屏类
        container.classList.remove('fullscreen');
        container.classList.remove('chart-fullscreen-container');
        // 清除容器中的内容
        container.innerHTML = '';
        this.renderChart();
      }
    },
    splitDescription(description) {
      // 简单按段落分割，不再处理字符数限制
      return description.split('\n').map(paragraph => paragraph.trim());
    }

  },
  mounted() {
    //this.renderChart()
    console.log('当前组件已经挂载')
  }
}
</script>

<style scoped>
.list-item {
  display: flex;
  align-items: center; /* 上下对齐 */
  gap: 10px;
  padding: 0 0 0 20px;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  background-color: #f5f5f5;
}

.checkbox {
  display: flex;
  transform: scale(1.5); /* 调大复选框 */
}

.content-wrapper {
  position: relative;
  margin-left: 10px;
  display: flex;
  flex-direction: column; /* 上下布局 */
  border-radius: 15px;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
}

.header {
  position: absolute;
  top: 10px; /* 设置距离上方的距离 */
  right: 10px; /* 设置距离右边的距离 */
}

.add-to-input-button {
  background-color: transparent; /* 背景色透明 */
  border: none; /* 删除边框 */
  padding: 0; /* 确保按钮没有内边距 */
}

.copy-icon {
  width: 40px; /* 设置图标的宽度 */
  height: 35px; /* 设置图标的高度 */
}

.chart-wrapper {
  flex: 1;
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.vega-chart-container {
  width: 80%;
  height: 40vh; /* 占浏览器窗口高度的2/3 */
}

.d3-chart-container {
  width: 90%;
  height: 40vh; /* 占浏览器窗口高度的2/3 */
}


.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.item-description {
  margin-top: 10px;
  margin-bottom: 30px;
  padding-left: 80px;
  color: #666;
  font-size: 15px;
  text-align: start; /* 文本左对齐 */
  width: calc(100%-20px); /* 考虑 padding-left 的影响 */
  overflow-wrap: break-word; /* 确保长单词换行 */
}

.item-description span {
  margin-top: 10px;
  display: block; /* 确保每个 span 在新行显示 */
  word-break: break-word; /* 确保长单词在行内换行 */
  text-align: left; /* 文本左对齐 */
  line-height: 1.5; /* 行高增加 */
}

.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色 */
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-fullscreen-container {
  width: 100%;
  height: 100%;
}

</style>
