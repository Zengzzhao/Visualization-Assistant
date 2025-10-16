return function (d3, outputData, container, width, height, topojson, seedrandom, Papa, voronoiTreemap, jLouvain, ForceGraph3D, cloud) {
    let { labels, matrix } = outputData;

    // 将矩阵反转以符合弦图布局的需求
    let matrixFlipped = [];
    for (let i = 0; i < labels.length; i++) {
        matrixFlipped[i] = [];
        for (let j = 0; j < labels.length; j++) {
            matrixFlipped[i][j] = matrix[j][i];
        }
    }

    const sumOfArcs = d3.sum(matrix.map(function (row) {
        return d3.sum(row);
    }));

    const arcPadding = 0.04;

    // 使用 d3 选择一个容器元素，并在其内部创建 svg 元素
    const svg = d3.select(container) // 选择 body 元素作为父容器，您可以根据需要选择其他元素
        .append('svg') // 在选定的元素内部创建 svg 元素
        .attr('width', width) // 设置 svg 元素的宽度
        .attr('height', height); // 设置 svg 元素的高度

    // 计算弦图的内外半径
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 10;

    // 定义弦图布局
    const chordLayout = customChordLayout()
        .padding(arcPadding)
        .sortChords(d3.descending)
        .matrix(matrixFlipped);

    const customColors = [
        "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
        "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
        "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
        "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5",
        "#003f5c", "#444e86", "#955196", "#dd5182", "#ff6e54"
    ];

    // 定义颜色比例尺，使用 customColors 作为颜色域
    const color = d3.scaleOrdinal()
        .range(customColors)
        .domain(d3.range(labels.length));

    // 在 SVG 中创建一个组元素，并将其移动到适当的位置
    const g = svg.append('g')
        .attr('transform', `translate(${(width - 200) / 2}, ${height / 2})`);

    // 绘制左边的弧 (source)
    g.selectAll('.group.source')
        .data(chordLayout.groups().filter(g => g.index % 2 === 0))
        .enter().append('g')
        .attr('class', 'group source')
        .each(function (d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .append('path')
        .attr('d', d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle(d => d.startAngle)
            .endAngle(d => d.endAngle))
        .style('fill', d => color(d.index))
        .style('stroke', d => d3.rgb(color(d.index)).darker());

    // 在左边的弧上添加文本标签
    g.selectAll('.group.source')
        .append('text')
        .each(function (d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .attr('dy', '.35em')
        .attr('transform', function (d) {
            return `rotate(${(d.angle * 180 / Math.PI - 90)})`
                + `translate(${outerRadius + 10})`
                + (d.angle > Math.PI ? 'rotate(180)' : '');
        })
        .attr('text-anchor', function (d) {
            return d.angle > Math.PI ? 'end' : null;
        })
        .text(function (d) {
            return labels[d.index];
        });

    // 绘制右边的弧 (target)
    g.selectAll('.group.target')
        .data(chordLayout.groups().filter(g => g.index % 2 === 1))
        .enter().append('g')
        .attr('class', 'group target')
        .each(function (d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .append('path')
        .attr('d', d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle(d => d.startAngle)
            .endAngle(d => d.endAngle))
        .style('fill', d => color(d.index))
        .style('stroke', d => d3.rgb(color(d.index)).darker());

    // 在右边的弧上添加文本标签
    g.selectAll('.group.target')
        .append('text')
        .each(function (d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .attr('dy', '.35em')
        .attr('transform', function (d) {
            return `rotate(${(d.angle * 180 / Math.PI - 90)})`
                + `translate(${outerRadius + 10})`
                + (d.angle > Math.PI ? 'rotate(180)' : '');
        })
        .attr('text-anchor', function (d) {
            return d.angle > Math.PI ? 'end' : null;
        })
        .text(function (d) {
            return labels[d.index];
        });

    // 添加 Tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

// 鼠标进入弦的事件处理函数
    function mouseoverChord(event, d) {
        // 获取当前弦的数据
        const currentChordData = d3.select(this).datum();

        if (currentChordData) {
            // 降低所有非选中的弦的透明度
            d3.selectAll('.chord')
                .filter(chord => chord !== currentChordData) // 确定当前触发事件的弦
                .transition().duration(200)
                .style('opacity', 0.3);

            // 计算弦的中心角度
            const sourceAngle = (currentChordData.source.startAngle + currentChordData.source.endAngle) / 2;
            const targetAngle = (currentChordData.target.startAngle + currentChordData.target.endAngle) / 2;
            const angle = (sourceAngle + targetAngle) / 2;

            // 计算弦的中心坐标
            const outerRadius = Math.min(width - 200, height) * 0.5 - 60;
            const innerRadius = outerRadius - 10;
            const chordCenterX = outerRadius * Math.cos(angle - Math.PI / 2);
            const chordCenterY = outerRadius * Math.sin(angle - Math.PI / 2);

            // 显示 tooltip
            const offsetX = 10; // 在弦的右侧显示
            const offsetY = -20; // 在弦的上方显示
            tooltip.transition().duration(200)
                .style('opacity', 0.9);
            tooltip.html(`<strong>${labels[currentChordData.source.index]} 与 ${labels[currentChordData.target.index]}</strong><br>合作量为：${currentChordData.source.value}`)
                .style('left', ((width - 200) / 2 + chordCenterX + offsetX) + 'px')
                .style('top', (height / 2 + chordCenterY + offsetY) + 'px');
        }
    }

// 鼠标离开弦的事件处理函数
    function mouseoutChord(event, d) {
        // 恢复所有弦的透明度
        d3.selectAll('.chord')
            .transition().duration(200)
            .style('opacity', 0.8);

        // 隐藏 tooltip
        tooltip.transition().duration(200)
            .style('opacity', 0);
    }

// 绘制弦
    const chords = g.selectAll('.chord')
        .data(chordLayout.chords())
        .enter().append('path')
        .attr('class', 'chord')
        .attr('d', d3.ribbon()
            .radius(innerRadius))
        .style('fill', d => color(d.source.index))
        .style('opacity', 0.8)
        .on('mouseover', mouseoverChord)
        .on('mouseout', mouseoutChord);

    const countries = [
        {"code": "NL", "name": "荷兰 (Netherlands)"},
        {"code": "US", "name": "美国 (United States)"},
        {"code": "JP", "name": "日本 (Japan)"},
        {"code": "GB", "name": "英国 (United Kingdom)"},
        {"code": "DE", "name": "德国 (Germany)"},
        {"code": "FR", "name": "法国 (France)"},
        {"code": "AT", "name": "奥地利 (Austria)"},
        {"code": "PL", "name": "波兰 (Poland)"},
        {"code": "BR", "name": "巴西 (Brazil)"},
        {"code": "CH", "name": "瑞士 (Switzerland)"},
        {"code": "IL", "name": "以色列 (Israel)"},
        {"code": "IT", "name": "意大利 (Italy)"},
        {"code": "ZA", "name": "南非 (South Africa)"},
        {"code": "KR", "name": "韩国 (South Korea)"},
        {"code": "SE", "name": "瑞典 (Sweden)"},
        {"code": "TR", "name": "土耳其 (Turkey)"},
        {"code": "ES", "name": "西班牙 (Spain)"},
        {"code": "PT", "name": "葡萄牙 (Portugal)"},
        {"code": "TW", "name": "台湾 (Taiwan)"},
        {"code": "HK", "name": "香港 (Hong Kong)"},
        {"code": "CY", "name": "塞浦路斯 (Cyprus)"},
        {"code": "CA", "name": "加拿大 (Canada)"},
        {"code": "SG", "name": "新加坡 (Singapore)"},
        {"code": "CN", "name": "中国 (China)"},
        {"code": "DK", "name": "丹麦 (Denmark)"},
        {"code": "NO", "name": "挪威 (Norway)"},
        {"code": "AU", "name": "澳大利亚 (Australia)"},
        {"code": "GR", "name": "希腊 (Greece)"},
        {"code": "BE", "name": "比利时 (Belgium)"},
        {"code": "IE", "name": "爱尔兰 (Ireland)"},
        {"code": "NZ", "name": "新西兰 (New Zealand)"},
        {"code": "IN", "name": "印度 (India)"},
        {"code": "AR", "name": "阿根廷 (Argentina)"},
        {"code": "IR", "name": "伊朗 (Iran)"},
        {"code": "SA", "name": "沙特阿拉伯 (Saudi Arabia)"},
        {"code": "RU", "name": "俄罗斯 (Russia)"},
        {"code": "HU", "name": "匈牙利 (Hungary)"},
        {"code": "CZ", "name": "捷克 (Czech Republic)"},
        {"code": "FI", "name": "芬兰 (Finland)"},
        {"code": "MT", "name": "马耳他 (Malta)"},
        {"code": "TH", "name": "泰国 (Thailand)"},
        {"code": "PE", "name": "秘鲁 (Peru)"},
        {"code": "YE", "name": "也门 (Yemen)"},
        {"code": "CO", "name": "哥伦比亚 (Colombia)"},
        {"code": "CL", "name": "智利 (Chile)"},
        {"code": "EG", "name": "埃及 (Egypt)"},
        {"code": "MO", "name": "澳门 (Macau)"},
        {"code": "IQ", "name": "伊拉克 (Iraq)"},
        {"code": "MA", "name": "摩洛哥 (Morocco)"},
        {"code": "SI", "name": "斯洛文尼亚 (Slovenia)"},
        {"code": "BD", "name": "孟加拉国 (Bangladesh)"},
        {"code": "MX", "name": "墨西哥 (Mexico)"},
        {"code": "TZ", "name": "坦桑尼亚 (Tanzania)"},
        {"code": "SS", "name": "南苏丹 (South Sudan)"},
        {"code": "QA", "name": "卡塔尔 (Qatar)"},
        {"code": "AE", "name": "阿联酋 (United Arab Emirates)"},
        {"code": "SK", "name": "斯洛伐克 (Slovakia)"},
        {"code": "BG", "name": "保加利亚 (Bulgaria)"},
        {"code": "MY", "name": "马来西亚 (Malaysia)"},
        {"code": "EC", "name": "厄瓜多尔 (Ecuador)"},
        {"code": "IS", "name": "冰岛 (Iceland)"},
        {"code": "VE", "name": "委内瑞拉 (Venezuela)"},
        {"code": "ID", "name": "印度尼西亚 (Indonesia)"}
    ];
    // 添加图例
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 300}, 100)`); // 调整图例的位置

    const legendItem = legend.selectAll('.legend-item')
        .data(labels)
        .enter().append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', (d, i) => color(i));

    legendItem.append('text')
        .attr('x', 15)
        .attr('y', 6)
        .attr('dy', '.35em')
        .text(d => {
            const country = countries.find(c => c.code === d);
            if (country) {
                return `${d}: ${country.name}`;
            } else {
                return d;
            }
        });

    // 定义自定义的弦图布局函数
    function customChordLayout() {
        var chord = {},
            chords,
            groups,
            matrix,
            n,
            padding = 0,
            sortGroups,
            sortSubgroups,
            sortChords;

        // 计算布局
        function relayout() {
            var subgroups = {},
                groupSums = [],
                groupIndex = d3.range(n),
                subgroupIndex = [],
                k,
                x,
                x0,
                i,
                j;

            chords = [];
            groups = [];
            k = 0;
            i = -1;

            // 计算组和子组的总和
            while (++i < n) {
                x = 0;
                j = -1;
                while (++j < n) {
                    x += matrix[i][j];
                }
                groupSums.push(x);
                subgroupIndex.push(d3.range(n).reverse());
                k += x;
            }

            // 如果提供了排序函数，则排序组和子组
            if (sortGroups) {
                groupIndex.sort(function (a, b) {
                    return sortGroups(groupSums[a], groupSums[b]);
                });
            }

            if (sortSubgroups) {
                subgroupIndex.forEach(function (d, i) {
                    d.sort(function (a, b) {
                        return sortSubgroups(matrix[i][a], matrix[i][b]);
                    });
                });
            }

            // 计算弦图的布局
            k = (2 * Math.PI - padding * n) / k;
            x = 0;
            i = -1;
            while (++i < n) {
                x0 = x;
                j = -1;
                while (++j < n) {
                    var di = groupIndex[i],
                        dj = subgroupIndex[di][j],
                        v = matrix[di][dj],
                        a0 = x,
                        a1 = x + v * k;
                    subgroups[di + "-" + dj] = {
                        index: di,
                        subindex: dj,
                        startAngle: a0,
                        endAngle: a1,
                        value: v,
                    };
                    x = a1;
                }

                groups[di] = {
                    index: di,
                    startAngle: x0,
                    endAngle: x,
                    value: (x - x0) / k,
                };

                x += padding;
            }

            // 计算弦
            i = -1;
            while (++i < n) {
                j = i - 1;
                while (++j < n) {
                    var source = subgroups[i + "-" + j],
                        target = subgroups[j + "-" + i];
                    if (source.value || target.value) {
                        chords.push(
                            source.value < target.value
                                ? {source: target, target: source}
                                : {source: source, target: target}
                        );
                    }
                }
            }

            // 如果提供了弦排序函数，则重新排序
            if (sortChords) {
                chords.sort(function (a, b) {
                    return sortChords(
                        (a.source.value + a.target.value) / 2,
                        (b.source.value + b.target.value) / 2
                    );
                });
            }
        }

        // 设置和获取布局参数的方法
        chord.matrix = function (x) {
            if (!arguments.length) return matrix;
            n = (matrix = x) && matrix.length;
            chords = groups = null;
            return chord;
        };

        chord.padding = function (x) {
            if (!arguments.length) return padding;
            padding = x;
            chords = groups = null;
            return chord;
        };

        chord.sortGroups = function (x) {
            if (!arguments.length) return sortGroups;
            sortGroups = x;
            chords = groups = null;
            return chord;
        };

        chord.sortSubgroups = function (x) {
            if (!arguments.length) return sortSubgroups;
            sortSubgroups = x;
            chords = null;
            return chord;
        };

        chord.sortChords = function (x) {
            if (!arguments.length) return sortChords;
            sortChords = x;
            if (chords) relayout();
            return chord;
        };

        // 获取计算后的弦和组的方法
        chord.chords = function () {
            if (!chords) relayout();
            return chords;
        };

        chord.groups = function () {
            if (!groups) relayout();
            return groups;
        };

        return chord;
    }
}