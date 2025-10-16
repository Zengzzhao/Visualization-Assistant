return function (data){
    const min_year = 2000;
    const max_year = 2024;
    const top_num = 40;
    var keyword_count = {};
    var data_dict = {};

    data.forEach(function(obj) {
        var year = obj.year;
        var keywords = obj.keywords || [];
        keywords.forEach(function(keyword) {
            keyword_count[keyword] = keyword_count[keyword] || {};
            keyword_count[keyword][year] = (keyword_count[keyword][year] || 0) + 1;
        });
    });

    Object.keys(keyword_count).forEach(function(item) {
        Object.keys(keyword_count[item]).forEach(function(year) {
            var keyword = item;
            var count = keyword_count[item][year];
            year = parseInt(year);
            if (year >= min_year && year <= max_year) {
                data_dict[keyword] = data_dict[keyword] || {"years": [], "counts": [], "total": 0};
                data_dict[keyword]["years"].push(year);
                data_dict[keyword]["counts"].push(count);
                data_dict[keyword]["total"] += count;
            }
        });
    });

    var sorted_data = Object.entries(data_dict).sort(function(a, b) {
        return b[1]["total"] - a[1]["total"];
    });

    var top_40_data = sorted_data.slice(0, num);

    top_40_data.forEach(function(entry) {
        var keyword = entry[0];
        var data = entry[1];
        var all_years = Array.from({length: max_year-min_year+1}, (_, i) => i + min_year);
        all_years.forEach(function(year) {
            if (!data["years"].includes(year)) {
                data["years"].push(year);
                data["counts"].push(0);
            }
        });

        var sorted_years_counts = data["years"].map(function(year, index) {
            return [year, data["counts"][index]];
        }).sort(function(a, b) {
            return a[0] - b[0];
        });

        data["years"] = sorted_years_counts.map(function(pair) {
            return pair[0];
        });
        data["counts"] = sorted_years_counts.map(function(pair) {
            return pair[1];
        });
    });

    var my_data = top_40_data.map(function(entry) {
        return {"keyword": entry[0], "years": entry[1]["years"], "counts": entry[1]["counts"], "total": entry[1]["total"]};
    });
    return my_data;
} 