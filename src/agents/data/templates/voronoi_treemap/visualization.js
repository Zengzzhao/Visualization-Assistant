return function (d3, filtered_data, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
  const customColors = [
        "#1f77b4", "#aec7e8",  "#ffbb78","#ff7f0e", "#2ca02c",
        "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
        "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
        "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5",
        "#003f5c","#444e86","#955196","#dd5182","#ff6e54"
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
  const freedom_nest = Array.from(d3.group(filtered_data, d => d.country), ([key, values]) => ({ key, values }));
// 将 freedom_nest 转换为适合 d3.hierarchy 的格式
const data_nested = { key: "freedom_nest", values: freedom_nest };
const population_hierarchy = d3.hierarchy(data_nested, d => d.values)
    .sum(d => d.cited || 0);

const margin = { top: 20, right: 150, bottom: 50, left: 50 };
const h = height - margin.top - margin.bottom;
const w = width - margin.left - margin.right;
const bigFormat = d3.format(",.0f");
const ellipse = d3.range(100).map(i => [
    ((w - 100) * (1 + 0.99 * Math.cos((i / 50) * Math.PI))) / 2,
    (h * (1 + 0.99 * Math.sin((i / 50) * Math.PI))) / 2
]);

// 使用 freedom_nest 中的键创建颜色比例尺
const colorScale = d3.scaleOrdinal(customColors)
    .domain(freedom_nest.map(d => d.key));

function colorHierarchy(hierarchy) {
    if (hierarchy.depth === 0) {
        hierarchy.color = '#865';
    } else if (hierarchy.depth === 1) {
        hierarchy.color = colorScale(hierarchy.data.key);
    } else {
        hierarchy.color = hierarchy.parent.color;
    }
    if (hierarchy.children) {
        hierarchy.children.forEach(child => colorHierarchy(child));
    }
}

const svg = d3.select(container)
    .append('svg')
    .attr('width', w + margin.left + margin.right)
    .attr('height', h + margin.top + margin.bottom);
const voronoi = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const labels = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width + margin.left - 60) + "," + margin.top + ")");
const legendRectSize = 18;
const legendSpacing = 6;

// 对 freedom_nest 进行排序
freedom_nest.sort((a, b) => b.values.length - a.values.length);
   const legendItems = legend.selectAll('.legend-item')
        .data(freedom_nest)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * (legendRectSize + legendSpacing)})`);
    legendItems.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', d => colorScale(d.key))
        .style('stroke', d => colorScale(d.key));
    legendItems.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(d => {
            const countryName = countries.find(c => c.code === d.key);
            return `${d.key}: ${countryName ? countryName.name : 'Unknown'} : ${d.values.length}`;
        })
        .attr('font-size', '12px')
        .attr('dy', '.35em')
        .attr('text-anchor', 'start')
        .style('font-family', 'Arial, sans-serif');
    let seed = seedrandom(20);
    let voronoiTreeMap = voronoiTreemap()
        .prng(seed)
        .clip(ellipse);
    voronoiTreeMap(population_hierarchy);
    colorHierarchy(population_hierarchy);
    let allNodes = population_hierarchy.descendants()
        .sort((a, b) => b.depth - a.depth)
        .map((d, i) => Object.assign({}, d, { id: i }));
    const infoBox = d3.select('body')
        .append('div')
        .attr('class', 'info-box')
        .style('position', 'absolute')
        .style('background', '#fff')
        .style('border', '1px solid #ccc')
        .style('padding', '10px')
        .style('pointer-events', 'none')
        .style('opacity', 0);
    voronoi.selectAll('path')
        .data(allNodes)
        .enter()
        .append('path')
        .attr('d', d => "M" + d.polygon.join("L") + "Z")
        .style('fill', d => d.parent ? d.parent.color : d.color)
        .attr("stroke", "#F5F5F2")
        .attr("stroke-width", 0)
        .style('fill-opacity', d => d.depth === 2 ? 1 : 0)
        .attr('pointer-events', d => d.depth === 2 ? 'all' : 'none')
        .on('mouseenter', function (event, d) {
            if (d.data && d.data.cited !== undefined) {
                d3.select(this).attr("stroke", "black");
                let htmlContent = `<strong>${d.parent.data.key}</strong><br>`;
                htmlContent += `title:${d.data.title}<br>year:${d.data.year}<br>cited times:${d.data.cited}<br>authors:${d.data.authors.join(", ")}`;
                infoBox.html(htmlContent)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .style('opacity', 0.9);
            }
        })
        .on('mouseleave', function (event, d) {
            d3.select(this).attr("stroke", "#F5F5F2");
            infoBox.style('opacity', 0);
        })
        .transition()
        .duration(1000)
        .attr("stroke-width", d => 7 - d.depth * 2.8)
        .style('fill', d => d.color);
    labels.selectAll('text')
        .data(allNodes.filter(d => d.depth === 2))
        .enter()
        .append('text')
        .attr('class', d => `label-${d.id}`)
        .attr('text-anchor', 'middle')
        .attr("transform", d => "translate(" + [d.polygon.site.x, d.polygon.site.y + 6] + ")")
        .text("") // Initially empty, will be filled on hover
        .attr('opacity', 0)
        .attr('cursor', 'default')
        .attr('pointer-events', 'none')
        .attr('fill', 'black')
        .style('font-family', 'Montserrat');
}    