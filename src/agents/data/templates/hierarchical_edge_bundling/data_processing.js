return function (data) {

    // 构建作者名字典，用于统计每个作者出现的次数和在同一authors下的其他作者
    const authorDict = {};
    
    data.forEach(paper => {
        paper.authors.forEach(author => {
            const authorName = "authors."+author.country+'.'+author.name;
            if (!authorDict[authorName]) {
                authorDict[authorName] = { count: 0, imports: new Set() };
            }
            authorDict[authorName].count += 1;
            paper.authors.forEach(otherAuthor => {
                const otherAuthorName = "authors."+otherAuthor.country+'.'+otherAuthor.name;
                if (otherAuthorName !== authorName) {
                    authorDict[authorName].imports.add(otherAuthorName);
                }
            });
        });
    });

    // 转换为数组，并按出现次数排序，取前100个作者
    const sortedAuthors = Object.entries(authorDict)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 100);

    // 生成最终的JSON格式数据
    const outputData = sortedAuthors.map(([authorName, info], index) => ({
        name: authorName,
        size: info.count,
        imports: Array.from(info.imports)  // 转为数组形式
    }));

    return outputData;
}
