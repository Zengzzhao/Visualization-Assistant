export class AgentExecutor {
    agent;
    tools = [];
    maxIterations = 15;

    constructor(agent) {
        this.agent = agent;
    }

    addTool(tools) {
        const _tools = Array.isArray(tools) ? tools : [tools];
        this.tools.push(..._tools);
    }

    /**
     * Construct tools description for prompt template
     */
    constructTools() {
        return this.tools.reduce((pre, cur, idx) => `${pre}${idx + 1}. ${cur.getSchema()}\n\n`, '');
    }

    constructToolNames() {
        return this.tools.map(val => val.name).join(',');
    }

    shouldContinue(iterations) {
        return iterations < this.maxIterations;
    }

    truncateResult(result, maxLength = 500) {
        if (typeof result === 'string' && result.length > maxLength) {
            return result.slice(0, maxLength) + '...';
        }
        return result;
    }

    async call(inputs, options) {
        return new Promise((resolve) => {
            const {callback} = options || {};
            const toolsByName = Object.fromEntries(this.tools.map(t => [t.name, t]));
            const steps = [];
            let iterations = 0;

            const oneStep = async () => {
                if (this.shouldContinue(iterations)) {
                    iterations++;
                    const tools = this.constructTools();
                    const toolNames = this.constructToolNames();
                    const output = await this.agent.plan(steps, {
                        tools,
                        tool_names: toolNames,
                        ...inputs,
                    });
                    callback?.nextPlan && callback.nextPlan(output.log, iterations);

                    if ('returnValues' in output) {
                        resolve(output);
                        return;
                    }

                    const actions = Array.isArray(output) ? output : [output];
                    const newSteps = await Promise.all(actions.map(async (action) => {
                        try {
                            const tool = toolsByName[action.tool];
                            if (!tool) throw new Error(`${action.tool} is not a valid tool, try another one.`);
                            const observation = await tool.call(action.toolInput);
                            //const truncatedObservation = {
                            //    ...observation,
                            //    result: this.truncateResult(observation.result)
                            //};
                            //return {action, observation: truncatedObservation ?? ''};
                            return {action, observation: observation ?? ''}
                        } catch (error) {
                            return {action, observation: {success: false, error: error.message}};
                        }
                    }));
                    steps.push(...newSteps);
                    setTimeout(oneStep, 3000);
                } else {
                    resolve({
                        returnValues: {output: 'Agent stopped due to max iterations.'},
                        log: '',
                    });
                }
            };

            setTimeout(oneStep, 0);
        });
    }

}
