import {createApp} from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import {idbKeyval} from './agents/db';
import sourceData from './agents/data/source.json';
import templates from './agents/data/template.json';
import dataDescription from './agents/data/description.json';
import visualVocabulary from './agents/data/visualVocabulary.json';
import visualExamples from './agents/data/examples.json';


const app = createApp(App)

// 清空 IndexedDB 数据库
async function clearDatabase() {
    await idbKeyval.clear();
    console.log('IndexedDB 数据库已清空');
    idbKeyval.set('sourceData', sourceData).then(() => {
        console.log('sourceData has been saved to IndexedDB');
    });
    idbKeyval.set('dataDescription', dataDescription).then(() => {
        console.log('dataDescription has been saved to IndexedDB');
    });
    idbKeyval.set('visualVocabulary', visualVocabulary).then(() => {
        console.log('visualVocabulary has been saved to IndexedDB');
    });
    idbKeyval.set('visualExamples', visualExamples).then(() => {
        console.log('visualExamples has been saved to IndexedDB');
    });
    idbKeyval.set('templates', templates).then(() => {
        console.log('Templates has been saved to IndexedDB');
    });
    await idbKeyval.set('initGrid', true);
}

// 清空数据库并启动应用程序
clearDatabase().then(() => {
    app.use(ElementPlus).mount('#app');
});

