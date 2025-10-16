import {StructuredTool} from './tool.js';
import {idbKeyval} from './db.js';


export function printFieldTypes(data, key=null, indent = 0) {
    let indentStr = ' '.repeat(indent);
    let result = '';
    const field = key? `Field: ${key} -` : '';

    if (Array.isArray(data)) {
        result += `${indentStr}- ${field} Type: array - Num: ${data.length}\n`
        if (data.length > 0) {
            result += printFieldTypes(data[0], null, indent+2);
        }
    } else if (typeof data === 'object' && data !== null) {
        result += `${indentStr}- ${field} Type: object - Pair num: ${Object.keys(data).length}\n`
        let cnt = 0;
        for (const [key, value] of Object.entries(data)) {
            result += printFieldTypes(value, key, indent + 2);
            cnt++;
            if (cnt > 10){
                result += ' '.repeat(indent+2) + '...\n'
                break
            }
        }
    } else {
        result += `${indentStr}- ${field} Type: ${typeof data} - example of content: ${data}\n`;
        //result += `${indentStr}- ${field} Type: ${typeof data}\n`;
    }

    return result;
}

async function executeAndCaptureOutput(fn) {
    let logs = []; // 用于记录输出的数组

    // 保存原始的 console 方法
    const originalError = console.error;
    const originalWarn = console.warn;

    // 重定向 console.error() 到 logs 数组
    console.error = function (...args) {
        const safeArgs = args.map(item => {
            try {
                return typeof item === 'object' ? JSON.stringify(item) : item.toString();
            } catch (e) {
                return '[Error converting item]';
            }
        });

        logs.push({type: 'error', message: safeArgs.join(' ')});
        originalError.apply(console, safeArgs); // 仍然将错误信息输出到控制台
    };

    // 重定向 console.warn() 到 logs 数组
    console.warn = function (...args) {
        const safeArgs = args.map(item => {
            try {
                return typeof item === 'object' ? JSON.stringify(item) : item.toString();
            } catch (e) {
                return '[Error converting item]';
            }
        });

        logs.push({type: 'warn', message: safeArgs.join(' ')});
        originalWarn.apply(console, safeArgs); // 仍然将警告信息输出到控制台
    };

    try {
        // 执行传入的函数，并获取其返回值
        const result = await fn();
        return {success: true, result, logs};
    } catch (error) {
        // 捕获异常，并返回错误信息和日志，同时输出错误到控制台
        console.error('Error occurred:', error.message);
        return {success: false, error: error.message, logs};
    } finally {
        // 恢复原始的 console 方法
        console.error = originalError;
        console.warn = originalWarn;
    }
}


export class ExecuteDataProcessingCodeTool extends StructuredTool {
    constructor() {
        super('ExecuteDataProcessingCode', "This tool will allow you to provide code and compare the output results to see if they match your expectations.\n" + 
            "The input should be a JavaScript code block and a piece of text.\n" +
            "The former is a standalone JavaScript function for processing data, which will receive a JSON object as input and should return a JSON object as output. \n"+
            "Example template:\n"+
            "```javascript\n" +
            "return function(data) {\n" +
            "  // Your data processing logic here\n" +
            "  return processedData;\n" +
            "}\n" +
            "```\n"+
            "The latter is a field explanation document for processedData, written in the format of the documentation for the field explanations of sourceData, used for comparison."+
            `Please ensure that the processed data is in a format accepted by Vega-Lite's data fields, such as a Key-Value Pair Array!`
        );
    }

    async run(inputs) {
        const code = inputs['jsArray'][0];
//        const code = `return function(data) {
//    // Step 1: Filter documents where at least one author is from China (CN)
//    const chinaDocs = data.filter(doc => 
//        doc.authors.some(author => author.country === "CN")
//    );
//
//    // Step 2: Aggregate data by year
//    const aggregatedData = chinaDocs.reduce((acc, doc) => {
//        const year = doc.year;
//        if (!acc[year]) {
//            acc[year] = { year: year, count: 0 };
//        }
//        acc[year].count += 1;
//        return acc;
//    }, {});
//
//    // Convert aggregatedData from object to array
//    return Object.values(aggregatedData);
//}
//`
        idbKeyval.set('dataProcessingCodeText', code);
        const pred = inputs['otherString'];
        console.log('数据处理代码:\n' + code)
        console.log('预期输出:\n' + pred)
        const sourceData = await idbKeyval.get('sourceData');
        let result = JSON.stringify(await executeAndCaptureOutput(() => {
            const fn = new Function(code)();
            const processedData = fn(sourceData);
            idbKeyval.set('processedData', processedData);
            const processedDataSummary = printFieldTypes(processedData);
            return "The field summary markdown document of processedData is as follows:\n" + processedDataSummary;
        }));
        console.log('处理后的数据：\n' + JSON.stringify(await idbKeyval.get('processedData')));

        console.log("Data processing code is: " + code);
        console.log("Data processing result summary is: " + result);
        return result;
    }

    get declaration() {
        return 'code: code block';
    }
}

export class ExecuteVegaLiteCodeTool extends StructuredTool {
    constructor(streamCallback) {
        super('ExecuteVegaLiteCode', "The input is the definition of the JSON object vlSpec. This tool will execute the command vegaEmbed('#vis', vlSpec); to render the script using Vega-Lite/v5.\n"+
            "Here is a template. Please modify it while retaining the content to avoid errors.\n"+
            "```json\n"+
            `{"$schema": "https://vega.github.io/schema/vega-lite/v5.json", \n"data" : {"values": <processedData>}, \n"mark": ..., \n"encoding": { ... } \n}\n`+
            "```"+
            `In the template, <processedData> represents processed data in object form, which will be automatically replaced with the original processed data when rendering Vega-Lite code. You just need to use it.\n`+
            `You can also write expressions about processedData between "<" and ">", such as using <processedData.someItem> to extract certain items of the processed data.\n` +
            `Please refer to the field summary markdown document of processedData returned by the ExecuteDataProcessingCode tool to understand its contents and generate matching visualization code.\n`+
            `You need to use this tool to complete the visualization task provided in the question by implementing the visualization scheme given earlier.`
        );
        this.streamCallback = streamCallback;
    }

    async run(inputs) {
        const vlSpec_string = inputs['jsonArray'][0];
        console.log(inputs['jsonArray'][0]);

        console.log("生成的vlSpec为\n" + vlSpec_string);
        await idbKeyval.set('visualizationSpecText', vlSpec_string);
        await idbKeyval.set('visualizationSpec', {type: "vega", vlSpec: vlSpec_string});
        let result = JSON.stringify(await executeAndCaptureOutput(async () => {
            const visualizationSpec = await idbKeyval.get('visualizationSpec');
            const processedData = await idbKeyval.get('processedData');
            const modify = this.count > 1
            console.log(`vega-lite渲染工具被调用了${this.count}次`)
            await this.streamCallback({
                type: 'visualization',
                visualizationSpec,
                processedData,
                modify,
            });
        }));
        return result;
    }

    get declaration() {
        return 'vlSpec: json';
    }
}


//export class MatchingVisualVocabularyTool extends StructuredTool {
//    constructor(llm) {
//        super('MatchingVisualVocabularyTool', 'Match the problem with a visualization vocabulary.');
//        this.llm = llm;
//        this._prompt = `You are an experienced data processing engineer, skilled in understanding complex visualization requirements posed by users. You can organize complex data processing scripts and visualization scripts to meet users' needs.
//        The user has presented you with the following requirement: {question}
//        I have provided you with a knowledge base of visualization solutions below, please Select the most matching chart from the most matching intention in the knowledge base:
//        {visualVocabulary}
//
//        Provide the output in the following format and do not include anything beyond the requirements, including explanations.:
//        Matching solution[string]: The solution information in JSON object format, containing several fields such as {chart_name, intention, description, Example FT uses, description, sketch}.`;
//    }
//
//    async run(question) {
//        const visualVocabularys = await idbKeyval.get('visualVocabulary');
//
//        const output = await this.llm.completeWithPrompt(this._prompt, {
//            question: question,
//            visualVocabulary: JSON.stringify(visualVocabularys)
//        });
//        const text = output.choices[0].message.content;
//
//        const parsedOutput = await this.transOutput(text);
//        return parsedOutput;
//    }
//
//    async transOutput(output) {
//        // Transform the output from LLM into structured data
//        const matchSolutionRegex = /Matching solution:\s*(.*)/i;
//        console.log(`>>>classification输出：\n` + output + `\n<<<`);
//        const matchSolutionMatch = output.match(matchSolutionRegex);
//
//        return {
//            matchSolution: matchSolutionMatch[1]
//        };
//    }
//
//
//    get declaration() {
//        return 'question: string';
//    }
//}


export class MatchingVisualExamplesTool extends StructuredTool {
    constructor(llm) {
        super('MatchingVisualExamplesTool', 'Match the problem with a visual examples library.');
        this.llm = llm;
        this._prompt = `You are an experienced data processing engineer, skilled in understanding complex visualization requirements posed by users. You can organize complex data processing scripts and visualization scripts to meet users' needs.
        The user has presented you with the following requirement: {question}
        I have provided you with a knowledge base of visualization examples below, please select one or two of the most relevant examples and return their names:
        {visualExamples}

        Provide the output in the following format and do not include anything beyond the requirements, including explanations:
        Matching example: <Result> (Replace <Result> with a ist of matching example names such as ["<name1>", "<name2>"].)`;
    }
    
    descriptionToMarkdownList(jsonArray) {
        return jsonArray.map(item => {
            return `- ${item.name}\n\t- ${item.description}`;
        }).join('\n');
    }
    
    codeToMarkdown(jsonArray) {
        let markdown = '# Vega-Lite Examples\n\n';
    
        jsonArray.forEach(item => {
            markdown += `## ${item.name}\n\n`;
            markdown += `**Description:** ${item.description}\n\n`;
            markdown += '```json\n';
            markdown += `${item.code}\n`;
            markdown += '```\n\n';
        });
    
        return markdown;
    }

    async run(question) {
        const visualExamples = await idbKeyval.get('visualExamples');
        const output = await this.llm.completeWithPrompt(this._prompt, {
            question: question,
            visualExamples: this.descriptionToMarkdownList(visualExamples)
        });
        const text = output.choices[0].message.content;

        const parsedOutput = await this.transOutput(text);
        return parsedOutput;
    }

    async transOutput(output) {
        const visualExamples = await idbKeyval.get('visualExamples');
        // Transform the output from LLM into structured data
        const matchExampleRegex = /Matching example:\s*(\{.*?\}|\[.*?\])/i;
        console.log(`>>>classification输出：\n` + output + `\n<<<`);
        const matchExampleMatch = output.match(matchExampleRegex);
        console.log(matchExampleMatch[1])
        const nameList = JSON.parse(matchExampleMatch[1])
        const filteredExamples = visualExamples.filter(item => nameList.includes(item.name));
        await idbKeyval.set('filteredExamplesDescription', this.descriptionToMarkdownList(filteredExamples))
        console.log('匹配的案例：', this.codeToMarkdown(filteredExamples))
        return {
            matchExamples: this.codeToMarkdown(filteredExamples)
        };
    }


    get declaration() {
        return 'question: string';
    }
}





async function modifyDataProcessing(llm, question, template) {
    const prompt = `
There is an existing visualization template:
Template: ${template.template}
Example: ${template.example}
Variants: ${template.variants.join(', ')}
Circumstances: ${template.circumstances.join(', ')}
Data processing code: 
\`\`\`javascript
${template.data_processing_code}
\`\`\`

Please adjust its data processing code to accommodate the following issue:
{question}
Provide the output in the following format and do not include anything beyond the requirements, including explanations:
Data_processing_code[javascript code block]: modify the data_processing_code with correct parameters
`
    const output = await llm.completeWithPrompt(prompt, {
        question: question
    });
    console.log('>>>modify输出\n' + output.choices[0].message.content + '\n<<<')
    const dataProcessingCodeRegex = /```javascript\s*([\s\S]*?)\s*```|([^]+?)(?=\n\S|$)/;
    const dataProcessingCodeMatch = output.choices[0].message.content.match(dataProcessingCodeRegex);
    console.log(dataProcessingCodeMatch)
    let dataProcessingCode = null;
    if (dataProcessingCodeMatch) {
        dataProcessingCode = dataProcessingCodeMatch[1] || dataProcessingCodeMatch[2];
        // Ensure the code is not truncated
        if (dataProcessingCode && dataProcessingCode.trim().slice(-1) !== '}') {
            dataProcessingCode += '}';
        }
    }
    return dataProcessingCode;
}



export class QuestionClassificationTool extends StructuredTool {
    constructor(llm) {
        super('QuestionClassificationTool', 'Classifies the question into two types: Template-based, or Non-Template-based.');
        this.llm = llm;
        this._prompt = `You are an experienced data processing engineer, skilled in understanding complex visualization requirements posed by users. You can organize complex data processing scripts and visualization scripts to meet users' needs.
        The user has presented you with the following requirement: {question}
        To fulfill this requirement, I have provided you with the following existing visualization project templates ,which variants is the parameter in this question with a default value:
        {template}
        When a template is matched, its question should be roughly consistent. 
        At the same time, refer to the situation in circumstances, which may contain some hints of Template-based/Non-Template-based.
        
        Provide the output in the following format and do not include anything beyond the requirements, including explanations:
        Matching Status: (choose one from {Template-based, Non-Template-based})
        Matching Template: (if matched, output the corresponding template's name, otherwise output 'None')
        Modify need: (output 'Yes' if question's parameters are same values with variants' default, otherwise output 'No')`;
    }

    
    async run(question) {
        const templates = await idbKeyval.get('templates');
        if (!templates) throw new Error('No templates found in the database.');
        if (question.includes('引用网络') || question.includes('引用关系')) {
            const matchedTemplate = templates.find(t => t.name === 'citation_network');
            await idbKeyval.set('dataProcessingCode', matchedTemplate.data_processing_code);
            const otherTemplates = templates.filter(t => t.name !== 'citation_network');
            const recommendedTemplates = randomSelectTemplates(otherTemplates, 3);
            await idbKeyval.set('recommended', recommendedTemplates);
            const classificationResult = {matchingStatus: 'Template-based', matchingTemplate: 'citation_network',}
            await idbKeyval.set('classificationResult', classificationResult);
            return classificationResult
        }
        const template_options = this.generateTemplateOptions(templates);

        const output = await this.llm.completeWithPrompt(this._prompt, {
            question: question,
            template: template_options
        });
        const text = output.choices[0].message.content;

        const parsedOutput = await this.transOutput(question, text);
        console.log(parsedOutput.dataProcessingCode);
        
        
        if (parsedOutput.matchingStatus === 'Template-based') {
            if (parsedOutput.dataProcessingCodeModifyNeed === 'Yes') {
                await idbKeyval.set('dataProcessingCode', parsedOutput.dataProcessingCode);
            } else {
                const matchedTemplate = templates.find(t => t.name === parsedOutput.matchingTemplate);
                if (matchedTemplate) {
                    await idbKeyval.set('dataProcessingCode', matchedTemplate.data_processing_code);
                }
            }

            const otherTemplates = templates.filter(t => t.name !== parsedOutput.matchingTemplate);
            const recommendedTemplates = randomSelectTemplates(otherTemplates, 3);
            await idbKeyval.set('recommended', recommendedTemplates);

            delete parsedOutput.dataProcessingCode;
            delete parsedOutput.dataProcessingCodeModifyNeed;
        }
        
        await idbKeyval.set('classificationResult', parsedOutput);
        return parsedOutput;

        function randomSelectTemplates(templates, num) {
            const selected = [];
            for (let i = 0; i < num && templates.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * templates.length);
                selected.push(templates[randomIndex].example);
                templates.splice(randomIndex, 1); // Remove the selected template from the array
            }
            return selected;
        }
    }

    generateTemplateOptions(templates) {
        return templates.map(t => `Name: ${t.name}\nTemplate: ${t.template}\nExample: ${t.example}\nVariants: ${t.variants.join(', ')}\nCircumstances: ${t.circumstances.join(', ')}\n`).join('\n\n');
    }

    async transOutput(question, output) {
        const templates = await idbKeyval.get('templates');
        // Transform the output from LLM into structured data
        const matchStatusRegex = /Matching Status:\s*(Template-based|Non-Template-based)\s*/i;
        const matchTemplateRegex = /Matching Template:\s*(\S+)\s*/i;
        const modifyNeedRegex = /Modify need:\s*(Yes|No)\s*/i;
        const matchStatusMatch = output.match(matchStatusRegex);
        const matchTemplateMatch = output.match(matchTemplateRegex);
        const modifyNeedMatch = output.match(modifyNeedRegex);

        console.log(`>>>classification输出：\n` + output + `\n<<<`);
        console.log(matchStatusMatch[1] + '\n'+matchTemplateMatch[1] + '\n' + modifyNeedMatch[1])
        let dataProcessingCode = null;

        if (matchStatusMatch && matchTemplateMatch && modifyNeedMatch) {
            if (matchStatusMatch[1] == 'Template-based' && modifyNeedMatch[1] == 'Yes') {

                const templateName = matchTemplateMatch[1];
                const matchedTemplate = templates.find(t => t.name == templateName);
                if (['stacked_stream', 'authors_force_index', 'keywords_force_index', 'keywords_line_index'].includes(templateName)) {
                    dataProcessingCode = await modifyDataProcessing(this.llm, question, matchedTemplate);
                } else {
                    dataProcessingCode = matchedTemplate.data_processing_code;
                }
            }
            return {
                matchingStatus: matchStatusMatch[1],
                matchingTemplate: matchTemplateMatch[1] == 'None' ? null : matchTemplateMatch[1],
                dataProcessingCodeModifyNeed: modifyNeedMatch[1],
                dataProcessingCode: dataProcessingCode
            };
        }

        return {
            matchingStatus: null,
            matchingTemplate: null,
            dataProcessingCodeModifyNeed: null,
            dataProcessingCode: null
        };
    }


    get declaration() {
        return 'question: string';
    }
}

export class TemplateVisualizationTool extends StructuredTool {
    constructor() {
        super('TemplateVisualizationTool',
            "The input should be a JSON object with the template name. The tool will retrieve the corresponding data processing function and visualization code from the database. Example template:\n\n" +
            "```json\n" +
            "{\n" +
            "  \"templateName\": \"不同国家文章数量变化趋势\"\n" +
            "}\n" +
            "```");
    }

    async run(inputs) {
        const templates = await idbKeyval.get('templates');
        if (!templates) throw new Error('No templates found in the database.');

        const {templateName} = inputs;
        const matchedTemplate = templates.find(t => t.name === templateName);

        console.log(matchedTemplate);
        if (!matchedTemplate) {
            throw new Error(`No matching template found for ${templateName}`);
        }

        const dataProcess = await idbKeyval.get('dataProcessingCode');
        console.log("数据处理代码：\n", dataProcess);
        const visualization_code = matchedTemplate.visualization_code;
        const type = matchedTemplate.type;

        // 处理数据
        const sourceData = await idbKeyval.get('sourceData');
        const dataProcessingResult = await executeAndCaptureOutput(() => {
            const fn = new Function(dataProcess)();
            const processedData = fn(sourceData);
            console.log("数据处理结果是：", processedData);
            idbKeyval.set('processedData', processedData);
            return processedData;
        });

        console.log("数据处理结果是：", dataProcessingResult);

        if (!dataProcessingResult.success) {
            return Promise.resolve({
                success: false,
                error: dataProcessingResult.error,
                logs: dataProcessingResult.logs
            });
        }

        const processedData = dataProcessingResult.result;

        // 保存可视化代码
        await idbKeyval.set('visualizationSpec', {type: type, vlSpec: visualization_code});

        // 返回结果
        const result = {
            data: JSON.stringify(processedData).slice(0, 2000),
            visualizationSpec: JSON.stringify(visualization_code)
        };

        return Promise.resolve(JSON.stringify({
            success: true,
            result,
            logs: [...dataProcessingResult.logs]
        }));
    }

    get declaration() {
        return 'json: {templateName: string}';
    }
}


export class ExplanationTool extends StructuredTool {
    constructor(llm) {
        super('ExplanationTool',
            "The input should be a JSON object with the template name and the visualization introduction. The tool will check if there is a corresponding template explanation. If not, it will use a general prompt to generate the explanation. Example template:\n\n" +
            "```json\n" +
            "{\n" +
            "  \"templateName\": \"不同国家文章数量变化趋势\",\n" +
            "  \"visualization\": \"2010年到2020年，中国和美国的文章数量变化情况\"\n" +
            "}\n" +
            "```");
        this.llm = llm;
    }


    async run(input) {
        const {inputs, streamCallback} = input;
        const {templateName, visualization} = inputs;
        const templates = await idbKeyval.get('templates');
        if (!templates) throw new Error('No templates found in the database.');

        const matchedTemplate = templates.find(t => t.name === templateName);

        let explanationPrompt = `You are an experienced data visualization engineer. Given the following processed data, generate a explanation that reflects the data changes for the visualization in Chinese: {visualization}\nHere's an Example:可视编码解释：该可视化展现了[2000]年到[2024]年[世界各国]发表的文章数量的变化。其中，横轴是时间轴，每条彩带代表一个国家，彩带的宽度代表发表文章的数量。\n结论和见解：我们看到，全部文章数量总体呈现增长，中国和美国发表了大多数文章，特别是中国2020年后文章数量迅猛增长。\nProcessed Data:\n{data}\n`;
        let processedData = await idbKeyval.get('processedData');

        if (matchedTemplate && matchedTemplate.explanation) {
            explanationPrompt = `You are an experienced data visualization engineer. Given the following processed data, generate a explanation based on the template explanation code for the visualization: {visualization}\n\nTemplate Explanation:\n${matchedTemplate.explanation}\n\nProcessed Data:\n{data}\n you just need to reply the context of explanation`;
        }

        const output = await this.llm.completeWithPrompt(explanationPrompt, {
            visualization: visualization,
            data: JSON.stringify(processedData).slice(0, 2000)
        });


        const text = output.choices[0].message.content;
        await idbKeyval.set('explanation', text);
        console.log('set成功')

        // 使用流式回调返回解释
        await streamCallback({
            type: 'explanation',
            message: text,
        });
        console.log('流式成功')

        return {success: true, result: text};
    }


    get declaration() {
        return 'json: {templateName: string, visualization: string}';
    }
}



export class ExplanationWithoutTemplateTool extends StructuredTool {
    constructor(llm) {
        super('ExplanationWithoutTemplateTool',
            "The input should be a JSON object with the template name and the visualization introduction. The tool will check if there is a corresponding template explanation. If not, it will use a general prompt to generate the explanation. Example template:\n\n" +
            "```json\n" +
            "{\n" +
            "  \"templateName\": \"不同国家文章数量变化趋势\",\n" +
            "  \"visualization\": \"2010年到2020年，中国和美国的文章数量变化情况\"\n" +
            "}\n" +
            "```");
        this.llm = llm;
    }

    async run(input) {
        const {inputs, streamCallback} = input;
        const {finalQuestion, exampleDocument} = inputs;
        const prompt = `你是一个经验丰富的可视化工程师，下面给你一段vega-lite可视化代码，用于分析“{finalQuestion}”这个问题。\n`+
            `{vegaCode}\n` +
            `现在需要你仔细观察这个vega-lite代码中的数据，以及vega-lite如何提取并展示数据中包含的有效信息，以及这些信息是如何关联到提出的可视化问题的，从中能分析出什么结论。需要你在最后给出对这段代码的可视编码解释以及结论和见解\n` +
            `你可以参考下面这个文档，是对相关可视化方案的介绍\n` +
            `{exampleDocument}\n` +
            `请使用下面的模板进行输出，且不要添加任何无关的思考过程等文本:\n` +
            `可视化编码解释：\n` +
            `结论和见解：`
            
        const output = await this.llm.completeWithPrompt(prompt, {
            finalQuestion: finalQuestion,
            vegaCode: JSON.stringify(await idbKeyval.get('completed_vlSpec')),
            exampleDocument: exampleDocument,
        });

        const text = output.choices[0].message.content;
        await idbKeyval.set('explanation', text);
        console.log('set成功')

        // 使用流式回调返回解释
        await streamCallback({
            type: 'explanation',
            message: text,
        });
        console.log('流式成功')

        return {success: true, result: text};
    }


    get declaration() {
        return 'json: {templateName: string, visualization: string}';
    }
}




export class NewQuestionDetectionTool extends StructuredTool {
    constructor(llm) {
        super('NewQuestionDetectionTool',
            "");
        this.llm = llm;
        this._prompt = `You are an experienced visualization engineer, capable of accurately analyzing users' visualization needs. Given the user's current question and previous questions, please determine whether the current question is a new question or a follow-up question.

Your task is:
1. Determine whether the current question is related to the previous one, or if it is not a standalone visualization question but rather a set of specific adjustment requests for the visualization outcomes derived from the previous inquiry.
2. If the current question is related to the previous question, consider it a follow-up question. Provide a final question that integrates the follow-up question into the previous question.
3. If the current question is not a follow-up question, consider it a new question. Use the original question as the "final question" for answering.

---
Here is a reference example:
Example 1:
Previous question: '2010年到2020年，全球各国的文章数量是如何变化的？'
Current question: '那15到22年呢'
Output:
{
  "Status": "follow-up"
  "Final Question": "2015年到2022年，全球各国的文章数量是如何变化的？"
}
*Example Analysis: Since the current question supplements and modifies the previous question, it should be considered a follow-up question. The complete question that integrates the current question into the previous question could be: '2015年到2022年，全球各国的文章数量是如何变化的？'*

Example 2:
Previous question: '通过三维力导向图可视化学术论文的引用网络。'
Current question: '这个领域中各个国家的影响力如何？'
Output:
{
  "Status": "new"
  "Final Question": "这个领域中各个国家的影响力如何？"
}
*Example Analysis: The current question is a new question because it corresponds to a different visualization task than the previous question and cannot be processed together.*

---

Here is the task you need to handle:

Current question: {current_question}
Previous question: {previous_question}

Your response should conform to the following template:

Output:
{
    "Status": (new or follow-up),
    "Final Question": "the final question"
}`;
    }

    async run(inputs) {
        const current_question = inputs.current_question, previous_question = inputs.previous_questions
        if (previous_question === '') {
            //previous_question === ''，即第一次打开输入框，没有先前问题只有当前问题
            await idbKeyval.set('previousQuestions', current_question);
            await idbKeyval.set('newQuestion', true);
            return current_question;
        }
        //所有对于智能体提问的函数全是completeWithPrompt函数
        const output = await this.llm.completeWithPrompt(this._prompt, {
            current_question: current_question,
            previous_question: previous_question
        });
        const text = output.choices[0].message.content;
        const matchText = text.match(/\{.*?\}/s)[0];
        console.log(">>>LLM输出:\n" + text + "<<<");

        try {
            const result = JSON.parse(matchText);
            const {Status, "Final Question": finalQuestion} = result;//llm返回的是状态和问题两个东西
            //如果是新问题，则之前保存的问题清空
            if (Status === 'new') {
                // 清空之前的问题记录，变为当前问题
                await idbKeyval.set('previousQuestions', current_question);
                await idbKeyval.set('newQuestion', true);//增加一个区域去显示图标
            } else {
                // 不是新问题则将新问题添加到之前的问题记录中
                await idbKeyval.set('previousQuestions', finalQuestion);
                await idbKeyval.set('newQuestion', false);
            }

            return finalQuestion;//返回最后的问题
        } catch (error) {
            throw new Error(`Could not parse the output from LLM: ${text}`);
        }
    }
}