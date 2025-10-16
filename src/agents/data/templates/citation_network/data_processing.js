return function (data) {
    let edges = [];
    let nodes = [];

    const papers = data;
    papers.forEach(p => {
        nodes.push({
            'id': p['id'],
            'title': p['title'],
            'year': p['year'],
            'cited': p['cited'],
            'authors': p['authors'].map(a => a['name'])
        });
    });
    const ids = new Set(nodes.map(x => x['id']));
    papers.forEach(p => {
        p['references'].forEach(r => {
            if (ids.has(r)) {
                edges.push({
                    'source': p['id'],
                    'target': r,
                    'weight': 1
                });
            }
        });
    });
    const jsonData = {
        'nodes': nodes,
        'links': edges
    };
    return jsonData;
}