import OpenAI from "openai";
import {AzureLLM} from './llm.js';
import {LLMSingleActionAgent} from './agent.js';
import {REACT_PROMPT} from './prompt.js';
import {
    QuestionClassificationTool,
    TemplateVisualizationTool,
    ExplanationTool,
    ExplanationWithoutTemplateTool,
    NewQuestionDetectionTool,
    //MatchingVisualVocabularyTool,
    MatchingVisualExamplesTool
    //printFieldTypes
} from './tools.js';
import {idbKeyval} from "@/agents/db";
//import {schemeGenerateCode} from './programmer.js'
import {exampleGenerateCode} from './programmer.js'

const model = new OpenAI({
    apiKey: process.env.VUE_APP_OPENAI_API_KEY,
    baseURL: 'https://api.openai-proxy.com/v1',
    defaultQuery: {'api-version': '2023-03-15-preview'},
    defaultHeaders: {
        'api-key': process.env.VUE_APP_OPENAI_API_KEY,
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Authorization": `Bearer ${process.env.VUE_APP_OPENAI_API_KEY}`
    },
    dangerouslyAllowBrowser: true
});

const llm = new AzureLLM({
    apiKey: process.env.VUE_APP_OPENAI_API_KEY,
    modelName: process.env.VUE_APP_OPENAI_MODEL,
    model
});

const agent = new LLMSingleActionAgent({llm});
agent.setPrompt(REACT_PROMPT);
agent.addStop(agent.observationPrefix);

const newQuestionDetectionTool = new NewQuestionDetectionTool(llm);
const questionClassificationTool = new QuestionClassificationTool(llm);
//const matchingVisualVocabularyTool = new MatchingVisualVocabularyTool(llm);
const matchingVisualExamplesTool = new MatchingVisualExamplesTool(llm);
const templateVisualizationTool = new TemplateVisualizationTool();
const explanationTool = new ExplanationTool(llm);
const explanationWithoutTemplateTool = new ExplanationWithoutTemplateTool(llm);


export async function callAgent(question, streamCallback) {
    let previousQuestions = await idbKeyval.get('previousQuestions') || '';
    //测试功能
    if (question.includes('<测试模板>')){
        await idbKeyval.set('previousQuestions', question);
        const regex = /\[(.*?)\]/;
        const selectTemplate = question.match(regex)[1];
        const templates = await idbKeyval.get('templates');
        const matchedTemplate = templates.find(t => t.name === selectTemplate);
        if (!matchedTemplate) return(`No matching template found for ${selectTemplate}`);
        await idbKeyval.set('dataProcessingCode', matchedTemplate['data_processing_code']);
        await templateVisualizationTool.safe_run({templateName: selectTemplate});

        const visualizationSpec = await idbKeyval.get('visualizationSpec');
        const processedData = await idbKeyval.get('processedData');

        streamCallback({
            type: 'visualization',
            visualizationSpec,
            processedData,
        });
        explanationTool.runStreamed({
            templateName: selectTemplate,
            visualization: question
        }, streamCallback).then(() => {
        });
        return `已生成模板{selectTemplate}的测试结果`;
    }



    // 调用 NewQuestionDetectionTool 判断是否是新问题，并获取最终的问题
    const finalQuestion = await newQuestionDetectionTool.safe_run({current_question:question, previous_questions:previousQuestions});
    const newQuestion = await idbKeyval.get('newQuestion')

    // 调用 QuestionClassificationTool 判断是否匹配模板
    let classificationResult = await idbKeyval.get('classificationResult');
    if (newQuestion) {
        classificationResult = await questionClassificationTool.safe_run(finalQuestion);
    }

    const {matchingStatus, matchingTemplate} = classificationResult;

    if ((matchingStatus === 'Template-based')) {
        // 如果匹配模板，调用 TemplateVisualizationTool 和 ExplanationTool
        await templateVisualizationTool.safe_run({templateName: matchingTemplate});

        // 获取并返回可视化图表，进行sql数据查询与可视化生成结果
        const visualizationSpec = await idbKeyval.get('visualizationSpec');
        const processedData = await idbKeyval.get('processedData');
        //给出可视化的结果
        streamCallback({
            type: 'visualization',
            visualizationSpec,
            processedData,
        });
        //调用解释生成的agent
        explanationTool.safe_run({
            inputs:{
                templateName: matchingTemplate,
                visualization: finalQuestion
            }, 
            streamCallback
        }).then(() => {
        });
    } else {
        // 如果不匹配模板，返回抱歉消息
        //streamCallback({
        //    type: 'error',
        //    message: "抱歉没有理解您的问题，您可以问如下问题：",
        //});
        //const matchVocabularyResult = await matchingVisualVocabularyTool.run(finalQuestion);
        //const visScheme = JSON.stringify(matchVocabularyResult.matchSolution);
        //console.log('匹配方案输出：', visScheme);
        //const output = await schemeGenerateCode(finalQuestion, visScheme, streamCallback);
        let visExamples = '';
        if(newQuestion){
            const matchExamplesResult = await matchingVisualExamplesTool.safe_run(finalQuestion);
            visExamples = '\nHere are several example Vega-Lite codes and corresponding descriptions that match this question for your reference:\n' + matchExamplesResult.matchExamples
        }
        
        const output = await exampleGenerateCode(newQuestion, previousQuestions, finalQuestion, visExamples, streamCallback);
        console.log(output)
        await explanationWithoutTemplateTool.safe_run({
            inputs:{
                finalQuestion: finalQuestion,
                exampleDocument: await idbKeyval.get('filteredExamplesDescription')
            }, 
            streamCallback
        }).then(() => {
        });
        return "有关您询问的：" + finalQuestion + "  可视化图表已经生成，详细查看右边区域";
    }

    // 返回最终结果
    return "有关您询问的：" + finalQuestion + "  可视化图表已经生成，详细查看右边区域";
}




