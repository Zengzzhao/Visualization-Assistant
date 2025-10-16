return function (d3, outputData, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
   const {nodes, links} = outputData;
    const nodes_ = nodes.map(d => d['id']);
    let community = jLouvain()
        .nodes(nodes_)
        .edges(links);
    let result = community();
    const label2num = {};
    for (const node of nodes) {
        node['label'] = result[node['id']];
        if (node['label'] in label2num) label2num[node['label']] += 1;
        else label2num[node['label']] = 1;
    }
    const myGraph = ForceGraph3D();
    myGraph(container)
        .nodeAutoColorBy('label')
        .linkAutoColorBy(d => result[d.source])
        .linkOpacity(0.5)
        .width(width)
        .height(height)
        .graphData(outputData);
};
