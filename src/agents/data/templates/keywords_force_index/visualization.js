return function (d3, output, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
    const threshold = 13;
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const links = output.links.filter(d => d.weight >= threshold);
    const nodes = output.nodes.map(n => Object.assign({label: n.id, priority: degree(output.links, n.id)}, n))
    console.log(nodes);
    console.log(links);

    //社区检查
    var nodeIds = nodes.map(function(node) {
        return node.id;
    });

    let community = jLouvain()
        .nodes(nodeIds)
        .edges(links)

    let community_assignment_result = community();
    console.log(community_assignment_result)

    //比例尺设置
    const r_scale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.size))
        .range([4, 10]);

    const w_scale = d3.scaleSqrt()
        .domain(d3.extent(links, d => d.weight))
        .range([1, 3]);

    //颜色设置
    const colorScheme = d3.schemeSet3;
    const colorScale = d3.scaleOrdinal(colorScheme)
        .domain(d3.range(5));
    function getColorById(id){
        id = community_assignment_result[id];
        return color(id);
    }

    //创建svg
    const svg = d3.select(container).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

    // 力设置
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX().strength(0.02))
        .force("y", d3.forceY().strength(0.02))
        .force('collide', d3.forceCollide((d) => r_scale(d.size) + 6))
        .on("tick", ticked);

    //links and nodes
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll()
        .data(links)
        .join("line")
        .attr("stroke-width", d => w_scale(d.weight));

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll()
        .data(nodes)
        .join("circle")
        .attr("r", d => r_scale(d.size))
        .attr("fill",d => getColorById(d.id));

    node.append("title")
        .text(d => d.id);

    //添加label
    const labels = svg.append("g")
        .attr('id', 'labels_g')
        .selectAll("g")
        .data(nodes.filter(d => d.priority))
        .enter()
        .append("g")
        .classed("label-box", true)
        .filter(d => d.priority !== undefined)
        .attr("data-priority", d => d.priority);

    labels.append("text")
        .classed("glow", true)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("font-size", 5)
        .text(d => d.label);

    labels.append("text")
        .attr("fill", "black")
        .attr("font-size", 5)
        .text(d => d.label);

    function ticked() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels.selectAll("text")
            .attr("x", d => d.x)
            .attr("y", d => d.y);

        occlusion(svg);
        d3.selectAll("#labels_g text").attr("dy", "-5");
    }

    // // 点击node高亮连线
    // node.on("click", function(event, d) {
    //     const selectedNodeId = d.id;
    //     link.attr("stroke", function(l) {
    //         return l.source.id === selectedNodeId || l.target.id === selectedNodeId ? "red" : "#999";
    //     });
    // });

    //添加拖动事件
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    function degree(links, id) {
        return links.filter(n => n.source === id || n.target === id).length;
    }

    function intersect(a, b) {
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    }

    function occlusion(svg) {
        const texts = [];
        svg.selectAll(".label-box").each((d, i, e) => {
            const bbox = e[i].getBoundingClientRect();
            texts.push({
                priority: +e[i].getAttribute("data-priority"),
                node: e[i],
                text: d,
                bbox,
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            });
        });

        texts.sort((a, b) => d3.descending(a.priority, b.priority));

        const filled = [];

        texts.forEach(d => {
            const isOccluded = filled.some(e => intersect(d, e));
            d3.select(d.node).classed("occluded", isOccluded);
            if (!isOccluded) filled.push(d);
        });
        return filled;
    }

    function setAttr(sel) {
        sel.each((d, i, e) => {
            for (const [k, v] of Object.entries(d.attr)) {
                e[i].setAttribute(k, v);
            }
        });
    }
}
    