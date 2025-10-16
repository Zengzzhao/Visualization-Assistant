{
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "mark": "area",
    "data" : {"values": <processedData>},
    "encoding": {
        "x": {
            "timeUnit": "yearmonth", "field": "date",
            "axis": {"domain": false, "format": "%Y", "tickSize": 0}
        },
        "y": {
            "aggregate": "sum", "field": "count",
            "axis": null,
            "stack": "center"
        },
        "color": {"field": "series", "scale": {"scheme": "category20b"}}
    }
}