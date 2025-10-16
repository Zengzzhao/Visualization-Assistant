<template>
  <div class="preview-item" ref="previewItem">
    <div class="content-wrapper">
      <div :class="['chart-wrapper', { 'vega-chart': isVegaChart, 'd3-chart': isD3Chart }]">
        <div ref="chartContainer"
             :class="['chart-container', { 'vega-chart-container': isVegaChart, 'd3-chart-container': isD3Chart }]"></div>
      </div>
      <div class="item-content">
        <div class="item-description">
          {{ item.description }}
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
    async renderChart() {
      const container = this.$refs.chartContainer;

      if (this.item.type === 'vega') {
        const spec = JSON.parse(JSON.stringify(this.item.spec));
        vegaEmbed(container, spec).catch(console.error);
      } else if (this.item.type === 'd3') {
        const data = await idbKeyval.get(`${this.item.keymap}`);
        this.item.spec(d3, data, container, 1025, 450, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud);
      }
    }
  },
  mounted() {
    this.renderChart();
  }
}
</script>

<style scoped>
.preview-item {
  display: flex;
  align-items: center; /* 上下对齐 */
  padding: 0 0 0 10px;
  margin-bottom: 0; /* 去掉 margin */
  border-left: 1px solid #ccc;
  border-right: 20px solid #f1f1f1;
  border-top: 1px solid #ccc; /* 添加顶部边框 */
  border-bottom: none; /* 去掉底部边框 */
  background-color: #f5f5f5;
}

.content-wrapper {
  margin-left: 10px;
  display: flex;
  flex-direction: column; /* 上下布局 */
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
}

.chart-wrapper {
  border-bottom: 1px solid #ccc; /* 添加底部边框 */
  margin-top: 20px;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.vega-chart-container {
  width: 80%;
  height: 100%; /* 占一半高度 */
}

.d3-chart-container {
  width: 90%;
  height: 100%; /* 占一半高度 */
}

.item-content {
  background-color: #f9f9f9; /* 内容区域底色 */
  border-top: 1px solid #ccc; /* 添加顶部边框 */
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.item-description {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  margin-bottom: 10px;
  padding-left: 0;
  color: #666;
  font-size: 15px;
  text-align: start; /* 左对齐 */
  white-space: pre-line; /* 保持换行 */
  text-overflow: ellipsis; /* 溢出用省略号表示 */
  width: 90%;
  height: 100%; /* 占一半高度 */
}
</style>
