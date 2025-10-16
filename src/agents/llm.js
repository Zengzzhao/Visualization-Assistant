//定义了一个agent该有的功能


import { OpenAI } from 'openai';
export class AzureLLM {
    _model;
    _modelName;
    constructor(options) {
        const { apiKey, model, modelName } = options;
        this._modelName = modelName;
        this._model = model || new OpenAI({
            apiKey,
            baseURL: 'https://search.bytedance.net/gpt/openapi/online/v2/crawl/openai/deployments',
            defaultQuery: { 'api-version': '2023-03-15-preview' },
            defaultHeaders: { 'api-key': apiKey },
        });
    }
    get modelName() {
        return this._modelName;
    }
    async complete(messages, stop) {
        const result = await this._model.chat.completions.create({
            model: this.modelName,
            temperature: 0,
            messages,
            stop,
        });
        return result;
    }
    //有3个参数，后两个参数用于debug，prompt才主要
    async completeWithPrompt(prompt, inputs, stop) {
        const _prompt = fillPromptTemplate(prompt, inputs);
        console.log('prompt', _prompt);//用于debug
        return this.complete([{ role: 'user', content: _prompt }], stop);//把prompt放进去获得回复
    }
}
export function fillPromptTemplate(promptTemplate, inputs) {
    let res = promptTemplate;
    for (const [key, val] of Object.entries(inputs))
        res = res.replaceAll(new RegExp(`{\\s*${key}\\s*}`, 'g'), val);
    return res;
}
