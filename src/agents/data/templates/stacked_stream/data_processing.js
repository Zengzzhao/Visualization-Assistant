return function (data) {
    const min_year = 2000;
    const max_year = 2024;
    
    // 初始化数据结构
    const country2year2count = {};
    const country2count = {};
    
    data.forEach(paper => {
        paper.authors.forEach(author => {
            const country = author.country;
            const year = paper.year;
            if (!country2count[country]) country2count[country] = 0;
            if (!country2year2count[country]) country2year2count[country] = {};
            if (!country2year2count[country][year]) country2year2count[country][year] = 0;

            country2count[country] += 1;
            country2year2count[country][year] += 1;
        });
    });
    
    // 处理数据
    const top20Countries = Object.entries(country2count)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(entry => entry[0]);
        
    const dataOutput = [];
    top20Countries.forEach(country => {
        for (let year = min_year; year <= max_year; year++) {
            const count = country2year2count[country][year] || 0;
            dataOutput.push({
                series: country,
                date: `${year}-01-01T08:00:00.000Z`,
                count: count
            });
        }
    });
    return dataOutput;
}