return function (json_data) {
  // 统计每个国家出现的次数
        const country_counts = {};
        json_data.forEach(entry => {
            // 获取第一个作者的国家和所有作者的名字
            let first_author_country = 'Unknown';
            let authors_names = [];
            if (entry.authors && entry.authors.length > 0) {
                first_author_country = entry.authors[0].country || 'Unknown';
                authors_names = entry.authors.map(author => author.name);
            }
            // 根据第一个作者的国家设置论文的国家
            entry.country = first_author_country;
            // 设置所有作者的名字
            entry.authors_names = authors_names;
            // 统计国家出现的次数
            country_counts[first_author_country] = (country_counts[first_author_country] || 0) + 1;
        });

        // 过滤数据，同时根据条件过滤
        const filtered_data = json_data.filter(entry => {
            const first_author_country = entry.country || 'Unknown';
            return (country_counts[first_author_country] >= 30 && entry.cited >= 20);
        }); return filtered_data
}
