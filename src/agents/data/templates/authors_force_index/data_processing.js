return function (data) {
    const top_num = 100;
    const authors_counter = {};
    const cooccurrence_counter = {};

    data.forEach(item => {
        const authors = item.authors.map(author => author.name);

        authors.forEach(author => {
            authors_counter[author] = (authors_counter[author] || 0) + 1;
        });

        const author_pairs = authors.flatMap((author1, i) =>
            authors.slice(i + 1).map(author2 => [author1, author2])
        );

        author_pairs.forEach(pair => {
            const sorted_pair = pair.sort().join();

            cooccurrence_counter[sorted_pair] = (cooccurrence_counter[sorted_pair] || 0) + 1;
        });
    });

    const top_authors = Object.entries(authors_counter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, top_num)
        .map(([author, count]) => author);

    const selected_authors = top_authors;
    const my_links = Object.entries(cooccurrence_counter)
        .filter(([pair, count]) => selected_authors.includes(pair.split(',')[0]) && selected_authors.includes(pair.split(',')[1]))
        .map(([pair, count]) => ({ source: pair.split(',')[0], target: pair.split(',')[1], weight: count }));

    const my_nodes = top_authors.map(author => ({ id: author, size: authors_counter[author] }));

    const  d3_data = { nodes:my_nodes, links:my_links, top_num:top_num};
    return d3_data;
}
    