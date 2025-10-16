

export class LLMSingleActionAgent {
    llm;
    stop;
    _prompt = '{input}';

    constructor({llm, stop = []}) {
        this.llm = llm;
        if (stop.length > 4)
            throw new Error('up to 4 stop sequences');
        this.stop = stop;
    }

    get agentActionType() {
        return 'single';
    }

    get prompt() {
        return this._prompt;
    }

    setPrompt(prompt) {
        this._prompt = prompt;
    }

    /**
     * Prefix to append the observation with.
     */
    get observationPrefix() {
        return 'Observation: ';
    }

    addStop(stop) {
        const _stops = Array.isArray(stop) ? stop : [stop];
        this.stop.push(..._stops);
    }

    async plan(steps, inputs) {
        const thoughts = this.constructScratchPad(steps);
        const newInputs = {
            ...inputs,
            agent_scratchpad: thoughts,
        };
        const output = await this.llm.completeWithPrompt(this._prompt, newInputs, this.stop);
        return this.transOutput2Action(output.choices[0].message.content);
    }

    transOutput2Action(text) {
        console.log(">>>LLM输出:\n" + text + "<<<");
        const FINAL_ANSWER_ACTION1 = 'Final Answer: ';
        const FINAL_ANSWER_ACTION2 = '最终答案: ';
        const includesAnswer = text.includes(FINAL_ANSWER_ACTION1) || text.includes(FINAL_ANSWER_ACTION2);
        const FINAL_ANSWER_ACTION = text.includes(FINAL_ANSWER_ACTION1)?FINAL_ANSWER_ACTION1:FINAL_ANSWER_ACTION2;
        const regex = /Action\s*\d*\s*:[\s]*(.*?)[\s]*Action\s*\d*\s*Input\s*\d*\s*:[\s]*([\s\S]*)/;
        const actionMatch = text.match(regex);
        if (actionMatch) {
            const action = actionMatch[1];
            //console.log("调用action:\n"+action);
            const actionInput = actionMatch[2];
            //console.log("调用actionInput:\n"+actionInput);
            const toolInput = actionInput.trim();
            return {
                tool: action,
                toolInput,
                log: text,
            };
        }
        if (includesAnswer) {
            const finalAnswerText = text.split(FINAL_ANSWER_ACTION)[1].trim();
            return {
                returnValues: {
                    output: finalAnswerText,
                },
                log: text,
            };
        }
        throw new Error(`Could not parse LLM output: ${text}`);
    }

    /**
     * Construct a scratchpad to let the agent continue its thought process
     */
    constructScratchPad(steps) {
        return steps.reduce((thoughts, {
            action,
            observation
        }) => `${thoughts}\n${action.log}${this.observationPrefix}${typeof observation === 'string' ? observation : JSON.stringify(observation)}\n`, '');
    }
}
