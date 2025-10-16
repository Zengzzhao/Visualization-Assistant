import OpenAI from "openai";
import {AzureLLM} from './llm.js';
import {LLMSingleActionAgent} from './agent.js';
import {REACT_PROMPT} from './prompt.js';
import {AgentExecutor} from './executor.js';
import {
    ExecuteDataProcessingCodeTool,
    ExecuteVegaLiteCodeTool,
    printFieldTypes
    //QuestionClassificationTool,
    //TemplateVisualizationTool,
    //ExplanationTool
} from './tools.js';
import {idbKeyval} from "@/agents/db";

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

const executor = new AgentExecutor(agent);
export async function schemeGenerateCode(question, visScheme, streamCallback) {
    executor.addTool([new ExecuteDataProcessingCodeTool(), new ExecuteVegaLiteCodeTool(streamCallback)]);
    const dataDescription = await idbKeyval.get('dataDescription');
    const result = await executor.call({
        documentation: `The sourceData contains metadata for a large number of documents, The documentation for the field explanations of sourceData is as follows:
${JSON.stringify(dataDescription)}
You need to use the following visualization scheme:
${visScheme}
Now, it is required to visualize using Vega-Lite v5.`,
        input: question
    }, {
        callback: {
            nextPlan: (log, iteration) => {
                console.log(`Iteration ${iteration} log: ${log}`);
            }
        }
    });

    return result.returnValues.output;
}

export async function exampleGenerateCode(newQuestion, previousQuestions, question, visExamples, streamCallback) {
    executor.addTool([new ExecuteDataProcessingCodeTool(), new ExecuteVegaLiteCodeTool(streamCallback)]);
    //const dataDescription = await idbKeyval.get('dataDescription');
    const dataDescription = printFieldTypes(await idbKeyval.get('sourceData'));
    let PreviousProblemPrompt = '';
    if (!newQuestion) {
        const lastDataProcessingCode = await idbKeyval.get('dataProcessingCodeText');
        const lastVisualizationSpec = await idbKeyval.get('visualizationSpecText');
        PreviousProblemPrompt = `Below is the code related to another question "${previousQuestions}" associated with this issue:
**DataProcessingCode**:
\`\`\`javascript
${lastDataProcessingCode}
\`\`\`
**VegaLiteCode**:
\`\`\`javascript
${lastVisualizationSpec}
\`\`\`
**Please make the necessary modifications based on the code above to complete the following tasks!**
`
    } 
    const result = await executor.call({
        documentation: `The sourceData contains metadata for a large number of documents, The documentation for the field explanations of sourceData is as follows:
${dataDescription}
${visExamples}
${PreviousProblemPrompt}
However, you must first perform data processing operations: extract or compute data from sourceData to match the Vega-Lite code you write, and organize it into the appropriate structure. After that, use the processed data in your Vega-Lite code.
Now, it is required to visualize using Vega-Lite v5.`,
        input: question
    }, {
        callback: {
            nextPlan: (log, iteration) => {
                console.log(`Iteration ${iteration} log: ${log}`);
            }
        }
    });

    return result.returnValues.output;
}
