return function (d3, sourceData, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
    const padding = 150;
    const size = 200;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#121212');

    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr('x', -20)
        .attr('y', -20)
        .attr('width', 50)
        .attr('height', 50)
        .attr("id", "glow");

    filter.append("feGaussianBlur")
        .attr('in', 'SourceGraphic')
        .attr("stdDeviation", 5)
        .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    const time_parse = d3.timeParse("%Y-%m-%d");
    const year_format = d3.timeFormat("%Y");
    const colors = ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"];

    function getAverageDate(date1, date2) {
        const timestamp1 = date1.getTime();
        const timestamp2 = date2.getTime();
        const averageTimestamp = Math.floor((timestamp1 + timestamp2) / 2);
        return new Date(averageTimestamp);
    }

    const stopwords = new Set([
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
        "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers",
        "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
        "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
        "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
        "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
        "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
        "through", "during", "before", "after", "above", "below", "to", "from", "up", "down",
        "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
        "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
        "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
        "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now",
        "xmlnsmmlhttpwwww3org1998mathmathml","fu","sf","sh","od","vr","ph","co","99","qr",
        "advertisement","xmlnsxlinkhttpwwww3org1999xlinktexmath"
    ]);

    for (let i = 0; i <= 9999; i++) {
        stopwords.add(i.toString());
    }

    function preprocessText(text) {
        text = text.toLowerCase().replace(/[^\w\s-]/g, '');
        return text.split(' ').filter(word => !stopwords.has(word) && word.length > 3).join(' ');
    }

    function g2Statistics(corpusCounter, targetCounter) {
        const c = Array.from(targetCounter.values()).reduce((acc, val) => acc + val, 0);
        const c_d = Array.from(corpusCounter.values()).reduce((acc, val) => acc + val, 0);
        const d = c_d - c;
        let word2g2 = {};
        targetCounter.forEach((a, w) => {
            const a_b = corpusCounter.get(w);
            const b = a_b - a;
            const e1 = c * a_b / c_d;
            const e2 = d * a_b / c_d;
            let g2;
            if (b === 0) {
                g2 = 2 * a * Math.log(a / e1);
            } else {
                try {
                    g2 = 2 * (a * Math.log(a / e1) + b * Math.log(b / e2));
                } catch (error) {
                    g2 = 0;
                }
            }
            if (a > e1) {
                word2g2[w] = g2;
            }
        });
        return Object.entries(word2g2).sort((a, b) => b[1] - a[1]).slice(0, 40);
    }

    sourceData.forEach(d => {
        delete d.authors;
        delete d.doi;
        delete d.references;
        d.title = preprocessText(d.title);
        d.abstract = preprocessText(d.abstract);
        if (d.keywords) {
            d.keywords = d.keywords.map(preprocessText);
        }
    });
    let timeGroups = d3.groups(sourceData, d => d.year);
    let g2Features = new Map();
    timeGroups.forEach(([year, papers]) => {
        let corpus = sourceData.map(d => d.title + ' ' + d.abstract).join(' ');
        let targetCorpus = papers.map(d => d.title + ' ' + d.abstract).join(' ');
        let corpusCounter = new Map();
        corpus.split(' ').forEach(word => {
            corpusCounter.set(word, (corpusCounter.get(word) || 0) + 1);
        });
        let targetCounter = new Map();
        targetCorpus.split(' ').forEach(word => {
            targetCounter.set(word, (targetCounter.get(word) || 0) + 1);
        });
        g2Features.set(year, g2Statistics(corpusCounter, targetCounter));
    });
    let combinedData = [];
    let years = Array.from(g2Features.keys()).sort();
    for (let i = 0; i < years.length; i += 5) {
        let startYear = years[i];
        let endYear = years[Math.min(i + 4, years.length - 1)];
        let groupFeatures = years.slice(i, i + 5).reduce((acc, year) => {
            acc[year] = g2Features.get(year);
            return acc;
        }, {});
        let wordsList = [];
        Object.values(groupFeatures).forEach(words => {
            words.forEach(([word, value]) => {
                wordsList.push({ word, value });
            });
        });
        combinedData.push({
            window: {
                start: `${startYear}-01-01`,
                end: `${endYear}-12-31`
            },
            words: wordsList
        });
    }
    const times = combinedData.map(d => {
        d.start = new Date(d.window.start);
        d.end = new Date(d.window.end);
        d.middle = getAverageDate(d.start, d.end);
        return d.start;
    });
    const x_scale = d3.scaleTime()
        .domain(d3.extent(times))
        .range([padding, width - padding]);
    const axis_line = svg.append('path')
        .attr('stroke', 'white')
        .attr('stroke-width', 3)
        .attr('fill', 'white')
        .attr('d', d3.line()([[padding - 100, height / 2], [width - padding + 75, height / 2]])); 
    combinedData.sort((a, b) => a.start - b.start);
    const wordcloud_gs = svg.selectAll('.wordcloud_g')
        .data(combinedData)
        .enter()
        .append('g')
        .attr('transform', (d, i) => `translate(${x_scale(d.middle) - size / 2 - 100}, ${i % 2 === 0 ? height / 2 - size - 30 : height / 2 + 30})`) 
        .each(function (d, i) {
            const g = d3.select(this);
            const rect = g.append('rect')
                .attr('width', size)
                .attr('height', size)
                .attr('fill-opacity', 0)
                .attr('stroke', 'white');
            const path_coord = i % 2 === 0 ? [[size / 2, size], [size / 2, size + 30]] : [[size / 2, 0], [size / 2, -30]];
            g.append('path')
                .attr('fill', 'white')
                .attr('stroke', 'white')
                .attr('stroke-width', 3)
                .attr('d', d3.line()(path_coord));
            g.append('text')
                .attr('fill', 'white')
                .attr('alignment-baseline', 'central')
                .attr('text-anchor', 'middle')
                .attr('font-size', 10)
                .attr('font-weight', 'bold')
                .attr('x', size / 2)
                .attr('y', i % 2 === 0 ? -15 : size + 15)
                .text(year_format(d.start) + ' ~ ' + year_format(d.end));
            const font_size_scale = d3.scaleSqrt()
                .domain(d3.extent(d.words, d => d.value))
                .range([10, 10]);
            let layout = cloud()
                .size([size, size])
                .words(d.words)
                .padding(1)
                .rotate(0)
                .font("Songti")
                .fontSize(d => d.size = font_size_scale(d.value))
                .on("word", function (word) {
                    const text = g.append("text");
                    text.attr('cursor', 'pointer')
                        .attr("font-size", word.size)
                        .attr('fill', colors[i % colors.length])
                        .attr("transform", `translate(${word.x},${word.y}) rotate(${word.rotate})`)
                        .attr("text-anchor", "middle")
                        .attr('font-weight', 'bold')
                        .style('pointer-events', 'all')
                        .attr("filter", "url(#glow)")
                        .text(word.word)
                        .on("mouseover", handleMouseOver)
                        .on("mouseout", handleMouseOut);
                    function handleMouseOver(d, i) {
                        d3.select(this).classed("word-hovered", true);
                    }
                    function handleMouseOut(d, i) {
                        d3.select(this).classed("word-hovered", false);
                    }
                });
            layout.start();
        });
    console.log(combinedData);
}