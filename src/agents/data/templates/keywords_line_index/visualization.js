return function (d3, output, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    const numCols = 5;
    const cellWidth = 340;
    const cellHeight = 120;

    for (let i = 0; i < output.length; i++) {
        const pDate = output[i]['counts'];

        const g = svg.append('g')
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('transform', function() {
                const col = i % numCols;
                const row = Math.floor(i / numCols);
                const x = col * cellWidth;
                const y = row * cellHeight;
                return 'translate(' + x + ',' + y + ')';
            });

        const xScale = d3.scaleLinear().domain([0, pDate.length - 1]).range([0, 200]);
        const yScale = d3.scaleLinear().domain([0, d3.max(pDate)]).range([100, 0]);

        //颜色设置
        const colorScheme = d3.schemeSet2;
        const colorScale = d3.scaleOrdinal(colorScheme)
            .domain(d3.range(5));
        function getColorById(id) {
            var index = id % 5;
            return colorScale(index);
        }

        //折线及区域绘制
        const area = d3.area()
            .x((d, i) => xScale(i))
            .y0(100)
            .y1(d => yScale(d));

        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d));

        g.append('path').datum(pDate)
            .attr('fill', getColorById(i))
            .attr('d', area);

        g.append('path').datum(pDate)
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        // 添加total
        g.append('text')
            .attr('x', 210)
            .attr('y', 20)
            .text('Total: ' + output[i]['total'])
            .style('font-size', '15px')
            .attr('fill', 'gray')
            .attr('font-weight','bold');

        // 添加keyword
        g.append('text')
            .attr('x', 210)
            .attr('y', 40)
            .style('font-size', '17px')
            .attr('font-weight','bold')
            .selectAll('tspan')
            .data(output[i]['keyword'].split(/ /))
            .enter().append('tspan')
            .text(function(d) { return d; })
            .attr('x', 210)
            .attr('dy', 20)
    }
}