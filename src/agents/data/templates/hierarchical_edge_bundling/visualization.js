return function (d3, outputData, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
    const radius = height / 2;

    const colorin = "#00f"; // 鼠标悬停时的颜色
    const colorout = "#f00"; // 鼠标移出时的颜色
    const colornone = "#ccc"; // 默认连接线的颜色

    const customColors = [
        "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
        "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
        "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
        "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5",
        "#003f5c", "#444e86", "#955196", "#dd5182", "#ff6e54"
    ];
    const countries = [
        {"code": "NL", "name": "荷兰 (Netherlands)"},
        {"code": "US", "name": "美国 (United States)"},
        {"code": "JP", "name": "日本 (Japan)"},
        {"code": "GB", "name": "英国 (United Kingdom)"},
        {"code": "DE", "name": "德国 (Germany)"},
        {"code": "FR", "name": "法国 (France)"},
        {"code": "AT", "name": "奥地利 (Austria)"},
        {"code": "PL", "name": "波兰 (Poland)"},
        {"code": "BR", "name": "巴西 (Brazil)"},
        {"code": "CH", "name": "瑞士 (Switzerland)"},
        {"code": "IL", "name": "以色列 (Israel)"},
        {"code": "IT", "name": "意大利 (Italy)"},
        {"code": "ZA", "name": "南非 (South Africa)"},
        {"code": "KR", "name": "韩国 (South Korea)"},
        {"code": "SE", "name": "瑞典 (Sweden)"},
        {"code": "TR", "name": "土耳其 (Turkey)"},
        {"code": "ES", "name": "西班牙 (Spain)"},
        {"code": "PT", "name": "葡萄牙 (Portugal)"},
        {"code": "TW", "name": "台湾 (Taiwan)"},
        {"code": "HK", "name": "香港 (Hong Kong)"},
        {"code": "CY", "name": "塞浦路斯 (Cyprus)"},
        {"code": "CA", "name": "加拿大 (Canada)"},
        {"code": "SG", "name": "新加坡 (Singapore)"},
        {"code": "CN", "name": "中国 (China)"},
        {"code": "DK", "name": "丹麦 (Denmark)"},
        {"code": "NO", "name": "挪威 (Norway)"},
        {"code": "AU", "name": "澳大利亚 (Australia)"},
        {"code": "GR", "name": "希腊 (Greece)"},
        {"code": "BE", "name": "比利时 (Belgium)"},
        {"code": "IE", "name": "爱尔兰 (Ireland)"},
        {"code": "NZ", "name": "新西兰 (New Zealand)"},
        {"code": "IN", "name": "印度 (India)"},
        {"code": "AR", "name": "阿根廷 (Argentina)"},
        {"code": "IR", "name": "伊朗 (Iran)"},
        {"code": "SA", "name": "沙特阿拉伯 (Saudi Arabia)"},
        {"code": "RU", "name": "俄罗斯 (Russia)"},
        {"code": "HU", "name": "匈牙利 (Hungary)"},
        {"code": "CZ", "name": "捷克 (Czech Republic)"},
        {"code": "FI", "name": "芬兰 (Finland)"},
        {"code": "MT", "name": "马耳他 (Malta)"},
        {"code": "TH", "name": "泰国 (Thailand)"},
        {"code": "PE", "name": "秘鲁 (Peru)"},
        {"code": "YE", "name": "也门 (Yemen)"},
        {"code": "CO", "name": "哥伦比亚 (Colombia)"},
        {"code": "CL", "name": "智利 (Chile)"},
        {"code": "EG", "name": "埃及 (Egypt)"},
        {"code": "MO", "name": "澳门 (Macau)"},
        {"code": "IQ", "name": "伊拉克 (Iraq)"},
        {"code": "MA", "name": "摩洛哥 (Morocco)"},
        {"code": "SI", "name": "斯洛文尼亚 (Slovenia)"},
        {"code": "BD", "name": "孟加拉国 (Bangladesh)"},
        {"code": "MX", "name": "墨西哥 (Mexico)"},
        {"code": "TZ", "name": "坦桑尼亚 (Tanzania)"},
        {"code": "SS", "name": "南苏丹 (South Sudan)"},
        {"code": "QA", "name": "卡塔尔 (Qatar)"},
        {"code": "AE", "name": "阿联酋 (United Arab Emirates)"},
        {"code": "SK", "name": "斯洛伐克 (Slovakia)"},
        {"code": "BG", "name": "保加利亚 (Bulgaria)"},
        {"code": "MY", "name": "马来西亚 (Malaysia)"},
        {"code": "EC", "name": "厄瓜多尔 (Ecuador)"},
        {"code": "IS", "name": "冰岛 (Iceland)"},
        {"code": "VE", "name": "委内瑞拉 (Venezuela)"},
        {"code": "ID", "name": "印度尼西亚 (Indonesia)"}
    ];

    const colorScale = d3.scaleOrdinal()
        .domain(customColors)
        .range(customColors);

    const tree = d3.cluster()
        .size([2 * Math.PI, radius - 100]);

    // 构建层次结构树，并在 bilink 中排序叶子节点
    const root = tree(bilink(d3.hierarchy(hierarchy(outputData))
        .sort((a, b) => d3.ascending(a.height, b.height) || d3.ascending(a.data.name, b.data.name))));

    // 选择 SVG 容器并创建 SVG 元素
    const svg = d3.select(container)
        .append('svg')
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // 给每个节点分配颜色
    root.each(node => {
        if (node.parent) {
            node.color = colorScale(node.parent.data.name);
        } else {
            node.color = colornone; // 根节点没有颜色
        }
    });

    const node = svg.append("g")
        .selectAll()
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
        .append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI ? 6 : -6)
        .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
        .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
        .text(d => d.data.name)
        .each(function (d) {
            d.text = this;
        })
        .on("mouseover", overed)
        .on("mouseout", outed)
        .call(text => text.append("title").text(d => {
            const parentName = d.parent ? d.parent.data.name : '';
            const countryName = countries.find(c => c.code === parentName);
            return `${id(d)}\nnumber of collaborations: ${d.incoming.length}\nCountry: ${countryName ? countryName.name : 'Unknown'}`;
        }))
        .attr("fill", d => d.color); // 根据节点的颜色属性填充颜色

    const line = d3.lineRadial()
        .curve(d3.curveBundle.beta(0.85))
        .radius(d => d.y)
        .angle(d => d.x);

    const link = svg.append("g")
        .attr("stroke", colornone) // 默认连接线的颜色为浅灰色
        .attr("stroke-width", 0.7) // 设置线条粗细
        .attr("fill", "none")
        .selectAll("path")
        .data(root.leaves().flatMap(leaf => leaf.outgoing))
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("stroke-opacity", 0.5) // 添加透明度设置
        .attr("d", ([i, o]) => line(i.path(o))) // 这里是路径的生成
        .each(function (d) {
            d.path = this;
        });

    function overed(event, d) {
        link.style("mix-blend-mode", null);
        d3.select(this).attr("font-weight", "bold");
        d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", colorin).raise();
        d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", colorin).attr("font-weight", "bold").attr("stroke-opacity", 0.1).attr("stroke-width", 0.7);
        d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", colorout).raise();
        d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", colorout).attr("font-weight", "bold").attr("stroke-opacity", 0.1).attr("stroke-width", 0.7);
    }

    function outed(event, d) {
        link.style("mix-blend-mode", "multiply");
        d3.select(this).attr("font-weight", null);
        d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", colornone);
        d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", d => d.color).attr("font-weight", null); // 恢复原来的颜色
        d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", colornone);
        d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", d => d.color).attr("font-weight", null); // 恢复原来的颜色
    }

    function hierarchy(data, delimiter = ".") {
        let root;
        const map = new Map();
        data.forEach(function find(data) {
            const {name} = data;
            if (map.has(name)) return map.get(name);
            const i = name.lastIndexOf(delimiter);
            map.set(name, data);
            if (i >= 0) {
                const parent = find({name: name.substring(0, i), children: []});
                parent.children.push(data);
                data.name = name.substring(i + 1);
                data.parent = parent;
            } else {
                root = data;
            }
            return data;
        });
        return root;
    }

    function bilink(root) {
        const map = new Map(root.leaves().map(d => [id(d), d]));
        // Initialize incoming and outgoing arrays
        root.leaves().forEach(d => {
            d.incoming = [];
            d.outgoing = [];
        });
        // Build outgoing and incoming connections
        root.leaves().forEach(d => {
            d.data.imports.forEach(i => {
                const target = map.get(i);
                if (target) {
                    d.outgoing.push([d, target]);
                    target.incoming.push([d, target]);
                }
            });
        });

        return root;
    }

    // 获取节点的 ID
    function id(node) {
        return `${node.parent ? id(node.parent) + "." : ""}${node.data.name}`;
    }
}