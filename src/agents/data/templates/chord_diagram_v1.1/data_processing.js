return function (data) {
        // 转换 JSON 数据为目标格式的函数
    function transformData(data) {
        // 创建存储国家之间连接关系的对象
        let countryConnections = {};

        // 遍历每条论文数据
        data.forEach(entry => {
            let authors = entry.authors;
            if (authors.length > 1) {
                let sourceCountry = authors[0].country;

                for (let i = 1; i < authors.length; i++) {
                    let targetCountry = authors[i].country;

                    if (sourceCountry && targetCountry && sourceCountry !== targetCountry) {
                        let connectionKey = [sourceCountry, targetCountry].sort().join('-');
                        if (!countryConnections[connectionKey]) {
                            countryConnections[connectionKey] = 0;
                        }
                        countryConnections[connectionKey]++;
                    }
                }
            }
        });

        // 转换为目标格式的数据结构
        let connections = [];
        Object.keys(countryConnections).forEach(key => {
            let countries = key.split('-');
            let connection = {
                source: countries[0],
                target: countries[1],
                value: countryConnections[key]
            };
            connections.push(connection);
        });

        // 按照'value'值降序排序
        connections.sort((a, b) => b.value - a.value);

        // 只保留前100条数据
        connections = connections.slice(0, 100);

        return connections;
    }

    // 将 JSON 数据转换为矩阵的函数
    function jsonToMatrix(data) {
        // 1. 找出所有不同的标签值
        let labels = [];
        data.forEach(item => {
            if (!labels.includes(item.source)) {
                labels.push(item.source);
            }
            if (!labels.includes(item.target)) {
                labels.push(item.target);
            }
        });

        // 2. 初始化矩阵
        let matrix = [];
        for (let i = 0; i < labels.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < labels.length; j++) {
                matrix[i][j] = 0;
            }
        }

        // 3. 填充矩阵
        data.forEach(item => {
            let sourceIndex = labels.indexOf(item.source);
            let targetIndex = labels.indexOf(item.target);
            matrix[sourceIndex][targetIndex] = item.value;
        });

        return { labels, matrix };
    }

    // 调用函数转换数据
    let jsonData = transformData(data);

    // 调用函数将 JSON 数据转换为矩阵
    let { labels, matrix } = jsonToMatrix(jsonData);

    // 返回处理后的标签和矩阵数据
    return { labels, matrix };
}
