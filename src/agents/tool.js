export class StructuredTool {
    name;
    description;
    count;
    maxRetries;

    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.count = 0;
        this.maxRetries = 3;
    }
    async safe_run(input) {
        let attempt = 0;
        let error = null;
        while (attempt < this.maxRetries) {
            try {
                // 尝试执行 run 函数
                const Result = await this.run(input);
                // 如果成功执行，则跳出循环
                return Result;
            } catch (e) {
                // 捕获错误并打印错误信息
                console.error(`Attempt ${attempt + 1} failed: ${e.message}`);
                error = e; // 保存最后一次捕获的错误
                attempt++;
            }
        }
    
        // 如果所有尝试都失败了，抛出最后一次错误
        console.error('All attempts failed');
        throw error;
    }
    async call(input) {
        this.count++;
        try {
            //if (input.includes('javascript')) {
            //    const regex = /```javascript\s*([\s\S]*?)\s*```/
            //    inputs = input.match(regex)[1];
            //} else if (input.includes('json')) {
            //    const regex = /```json\s*([\s\S]*?)\s*```/
            //    inputs = JSON.parse(input.match(regex)[1]);
            //} else {
            //    inputs = JSON.parse(input);
            //}
            const jsregex = /```javascript\s*([\s\S]*?)\s*```/g;
            const jsonregex = /```json\s*([\s\S]*?)\s*```/g;
            const blankregex = /(?:```javascript[\s\S]*?```)|([\s\S]+?)(?=\s*```javascript|$)/g
            const jsArray = []
            let match;
            while ((match = jsregex.exec(input)) !== null) {
                jsArray.push(match[1].trim());  // match[1] is the captured content, trim to remove any extra whitespace
            }
            const jsonArray = []
            while ((match = jsonregex.exec(input)) !== null) {
                jsonArray.push(match[1].trim());  // match[1] is the captured content, trim to remove any extra whitespace
            }
            let otherString = ''
            while ((match = blankregex.exec(input)) !== null) {
                if (match[1]) {
                    otherString += match[1].trim() + '\n';  // match[1] contains the text outside @@@javascript...@@@ blocks
                }
            }
            const inputs = {jsArray, jsonArray, otherString}

            return await this.safe_run(inputs);
        } catch (e) {
            throw new Error(`${input} can not be parsed as JSON, ${e}`);
        }
    }

    getSchema() {
        return `${this.name} | ${this.description}`;
    }
}