return function (data) {
    const top_num = 40  ;// 选择热度前40的词
    const keywords_counter = {};
    const cooccurrence_counter = {};

    data.forEach(function(item) {
        const keywords = item.keywords || [];
        keywords.forEach(function(keyword) {
            keywords_counter[keyword] = (keywords_counter[keyword] || 0) + 1;
        });

        const keyword_pairs = keywords.flatMap((keyword1, idx1) => keywords.slice(idx1 + 1).map(keyword2 => [keyword1, keyword2]));
        keyword_pairs.forEach(function(pair) {
            const sorted_pair = pair.sort().join(',');
            cooccurrence_counter[sorted_pair] = (cooccurrence_counter[sorted_pair] || 0) + 1;
        });
    });

    const top_keywords = Object.entries(keywords_counter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, top_num)
        .map(([keyword]) => keyword);
    const selected_keywords = new Set(top_keywords);

    const my_nodes = Object.entries(keywords_counter)
        .filter(([keyword]) => selected_keywords.has(keyword))
        .map(([keyword, count]) => ({ id: keyword, size: count }));

    const my_links = Object.entries(cooccurrence_counter)
        .filter(([pair]) => pair.split(',').every(keyword => selected_keywords.has(keyword)))
        .map(([pair, weight]) => {
            const [source, target] = pair.split(',');
            return { source, target, weight };
        });

    // 构建最终的JSON数据
    const d3_data = { nodes:my_nodes, links:my_links };
    return d3_data;
}