/**
 * @private
 */
Ext.define('Ext.chart.theme.Base', {
    singleton: true,
    selectors: [
        {
            "selector": "chart",
            "style": {
                "padding": 10,
                "colors": [
                    "#115fa6",
                    "#94ae0a",
                    "#a61120",
                    "#ff8809",
                    "#ffd13e",
                    "#a61187",
                    "#24ad9a",
                    "#7c7474",
                    "#a66111"
                ]
            },
            "specificity": [
                0,
                0,
                1
            ]
        },
        {
            "selector": "chart axis",
            "style": {
                "color": "#354f6e",
                "fill": "#354f6e",
                "stroke": "#cccccc",
                "lineWidth": 1
            },
            "specificity": [
                0,
                0,
                2
            ]
        },
        {
            "selector": "chart axis label",
            "style": {
                "color": "#354f6e",
                "fill": "#354f6e",
                "font": "12px \"Helvetica\", \"Arial\", \"sans-serif\"",
                "spacing": 2,
                "padding": 5
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart axis title",
            "style": {
                "font": "18px \"Helvetica\", \"Arial\", \"sans-serif\"",
                "color": "#354f6e",
                "fill": "#354f6e",
                "padding": 5
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart axis[position=\"left\"] title",
            "style": {
                "rotate": {
                    "x": 0,
                    "y": 0,
                    "degrees": 270
                }
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart axis[position=\"right\"] title",
            "style": {
                "rotate": {
                    "x": 0,
                    "y": 0,
                    "degrees": 270
                }
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart axis[position=\"radial\"]",
            "style": {
                "fill": "none"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart axis[position=\"radial\"] label",
            "style": {
                "font": "10px \"Helvetica\", \"Arial\", \"sans-serif\"",
                "textAlign": "middle"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart axis[position=\"gauge\"]",
            "style": {
                "fill": "none"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart axis[position=\"gauge\"] label",
            "style": {
                "font": "10px \"Helvetica\", \"Arial\", \"sans-serif\"",
                "textAlign": "middle"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart series",
            "style": {
                "lineWidth": 1
            },
            "specificity": [
                0,
                0,
                2
            ]
        },
        {
            "selector": "chart series label",
            "style": {
                "font": "12px \"Helvetica\", \"Arial\", \"sans-serif\"",
                "fill": "#333333",
                "display": "none",
                "field": "name",
                "minMargin": "50"
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart series:nth-child(1)",
            "style": {
                "fill": "#115fa6"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(2)",
            "style": {
                "fill": "#94ae0a"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(3)",
            "style": {
                "fill": "#a61120"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(4)",
            "style": {
                "fill": "#ff8809"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(5)",
            "style": {
                "fill": "#ffd13e"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(6)",
            "style": {
                "fill": "#a61187"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(7)",
            "style": {
                "fill": "#24ad9a"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(8)",
            "style": {
                "fill": "#7c7474"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:nth-child(9)",
            "style": {
                "fill": "#a66111"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series:highlight",
            "style": {
                "radius": 20,
                "lineWidth": 5,
                "stroke": "#ff5555",
                "zIndex": "100"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart series[type=\"line\"]:highlight",
            "style": {
                "lineWidth": 3
            },
            "specificity": [
                0,
                2,
                2
            ]
        },
        {
            "selector": "chart series[type=\"bar\"]:highlight",
            "style": {
                "lineWidth": 3,
                "stroke": "#5555cc",
                "opacity": 0.8
            },
            "specificity": [
                0,
                2,
                2
            ]
        },
        {
            "selector": "chart series[type=\"area\"]:highlight",
            "style": {
                "lineWidth": 3,
                "stroke": "#111111"
            },
            "specificity": [
                0,
                2,
                2
            ]
        },
        {
            "selector": "chart series[type=\"pie\"]:highlight",
            "style": {
                "stroke": "none",
                "lineWidth": 0
            },
            "specificity": [
                0,
                2,
                2
            ]
        },
        {
            "selector": "chart series[type=\"scatter\"]:highlight",
            "style": {
                "stroke": "none",
                "lineWidth": 0
            },
            "specificity": [
                0,
                2,
                2
            ]
        },
        {
            "selector": "chart marker",
            "style": {
                "stroke": "#ffffff",
                "lineWidth": 1,
                "type": "circle",
                "fill": "#000000",
                "radius": 5,
                "size": 5
            },
            "specificity": [
                0,
                0,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(1)",
            "style": {
                "fill": "#115fa6",
                "type": "circle"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(2)",
            "style": {
                "fill": "#94ae0a"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(3)",
            "style": {
                "fill": "#a61120"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(3)",
            "style": {
                "fill": "#a61120"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(4)",
            "style": {
                "fill": "#ff8809"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(5)",
            "style": {
                "fill": "#ffd13e"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(6)",
            "style": {
                "fill": "#a61187"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(7)",
            "style": {
                "fill": "#24ad9a"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(8)",
            "style": {
                "fill": "#7c7474"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart marker:nth-child(9)",
            "style": {
                "fill": "#a66111"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart interaction[type=\"itemcompare\"] circle",
            "style": {
                "fill": "rgba(0, 0, 0, 0)",
                "stroke": "#0d75f2",
                "radius": 5
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart interaction[type=\"itemcompare\"] line",
            "style": {
                "stroke": "#0d75f2",
                "lineWidth": 3
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart interaction[type=\"itemcompare\"] arrow",
            "style": {
                "fill": "#0d75f2",
                "radius": 8
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart interaction[type=\"piegrouping\"] slice",
            "style": {
                "stroke": "#0d75f2",
                "lineWidth": 2,
                "fill": "#0d75f2",
                "opacity": 0.5
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart interaction[type=\"piegrouping\"] handle",
            "style": {
                "stroke": "#0d75f2",
                "lineWidth": 2,
                "fill": "#0d75f2"
            },
            "specificity": [
                0,
                1,
                3
            ]
        }
    ]
});
Ext.define('Ext.chart.theme.Demo', {
    singleton: true,
    selectors: [
        {
            "selector": "chart[themeCls=\"area1\"] axis[position=\"left\"] grid even",
            "style": {
                "opacity": 1,
                "fill": "#dddddd",
                "stroke": "#bbbbbb",
                "stroke-width": 1
            },
            "specificity": [
                0,
                2,
                4
            ]
        },
        {
            "selector": "chart[themeCls=\"area1\"] axis[position=\"bottom\"] label",
            "style": {
                "rotate": {
                    "degrees": 45
                }
            },
            "specificity": [
                0,
                2,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"area1\"] series",
            "style": {
                "opacity": 0.93
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"bar1\"] axis[position=\"bottom\"] grid",
            "style": {
                "stroke": "#cccccc"
            },
            "specificity": [
                0,
                2,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"]",
            "style": {
                "background": "#111111"
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"] axis",
            "style": {
                "stroke": "#eeeeee",
                "fill": "#eeeeee"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"] axis label",
            "style": {
                "fill": "#ffffff"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"] axis title",
            "style": {
                "fill": "#ffffff"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"] axis[position=\"left\"] grid odd",
            "style": {
                "stroke": "#555555"
            },
            "specificity": [
                0,
                2,
                4
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"] axis[position=\"left\"] grid even",
            "style": {
                "stroke": "#555555"
            },
            "specificity": [
                0,
                2,
                4
            ]
        },
        {
            "selector": "chart[themeCls=\"column1\"] series label",
            "style": {
                "fill": "#ffffff",
                "font": "17px Arial",
                "display": "insideEnd",
                "textAlign": "middle",
                "orientation": "horizontal"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"barcombo1\"] axis[position=\"bottom\"] grid",
            "style": {
                "stroke": "#cccccc"
            },
            "specificity": [
                0,
                2,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"piecombo1\"]",
            "style": {
                "padding": 20
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"piecombo1\"] series label",
            "style": {
                "display": "rotate",
                "contrast": true,
                "font": "14px Arial"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"gaugecombo1\"]",
            "style": {
                "padding": 30
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"gaugecombo1\"] axis",
            "style": {
                "stroke": "#cccccc"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"gaugecombo1\"] axis label",
            "style": {
                "font": "15px Arial"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"radarcombo1\"]",
            "style": {
                "padding": 20
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"radarcombo1\"] axis",
            "style": {
                "stroke": "#cccccc",
                "fill": "none"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"radarcombo1\"] axis label",
            "style": {
                "font": "11px Arial",
                "textAlign": "middle"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"radarcombo1\"] series",
            "style": {
                "opacity": 0.4
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"line1\"] axis[position=\"left\"] grid odd",
            "style": {
                "opacity": 1,
                "fill": "#dddddd",
                "stroke": "#bbbbbb",
                "stroke-width": 0.5
            },
            "specificity": [
                0,
                2,
                4
            ]
        },
        {
            "selector": "chart[themeCls=\"line1\"] marker",
            "style": {
                "size": 4,
                "radius": 4,
                "stroke-width": 0
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"line1\"] series:nth-child(1) marker",
            "style": {
                "type": "image",
                "height": "46",
                "width": "46",
                "src": "../resources/shared/img/iphone.png"
            },
            "specificity": [
                0,
                2,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"line1\"] series:nth-child(2) marker",
            "style": {
                "type": "image",
                "height": "46",
                "width": "46",
                "src": "../resources/shared/img/android.png"
            },
            "specificity": [
                0,
                2,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"line1\"] series:nth-child(3) marker",
            "style": {
                "type": "image",
                "height": "46",
                "width": "46",
                "src": "../resources/shared/img/ipad.png"
            },
            "specificity": [
                0,
                2,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"pie1\"]",
            "style": {
                "padding": 10
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"pie1\"] series label",
            "style": {
                "display": "rotate",
                "contrast": true,
                "font": "18px Helvetica, Arial, sans-serif"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"radar1\"]",
            "style": {
                "padding": 20
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"radar1\"] axis",
            "style": {
                "stroke": "#cccccc",
                "fill": "none"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"radar1\"] axis label",
            "style": {
                "font": "11px Arial",
                "textAlign": "middle"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"radar1\"] series",
            "style": {
                "opacity": 0.4
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"scatter1\"]",
            "style": {
                "padding": 40
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"scatter1\"] axis[position=\"left\"] grid odd",
            "style": {
                "opacity": 1,
                "fill": "#dddddd",
                "stroke": "#bbbbbb",
                "stroke-width": 0.5
            },
            "specificity": [
                0,
                2,
                4
            ]
        },
        {
            "selector": "chart[themeCls=\"scatter1\"] marker",
            "style": {
                "size": 8,
                "radius": 8
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart[themeCls=\"stock1\"] axis label",
            "style": {
                "font": "12px Arial"
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"stock1\"] axis[position=\"left\"] grid",
            "style": {
                "stroke": "#cccccc"
            },
            "specificity": [
                0,
                2,
                3
            ]
        }
    ]
});
Ext.define('Ext.chart.theme.Energy', {
    singleton: true,
    selectors: [
        {
            "selector": "chart",
            "style": {
                "colors": [
                    "rgba(17, 95, 166, 0.85)",
                    "rgba(148, 174, 10, 0.85)",
                    "rgba(166, 17, 32, 0.85)",
                    "rgba(255, 136, 9, 0.85)",
                    "rgba(255, 209, 62, 0.85)",
                    "rgba(166, 17, 135, 0.85)",
                    "rgba(36, 173, 154, 0.85)",
                    "rgba(124, 116, 116, 0.85)",
                    "rgba(166, 97, 17, 0.85)"
                ]
            },
            "specificity": [
                0,
                0,
                1
            ]
        },
        {
            "selector": "chart series",
            "style": {
                "stroke-width": 2
            },
            "specificity": [
                0,
                0,
                2
            ]
        },
        {
            "selector": "chart series grid odd",
            "style": {
                "stroke": "#333333"
            },
            "specificity": [
                0,
                0,
                4
            ]
        },
        {
            "selector": "chart series grid even",
            "style": {
                "stroke": "#222222"
            },
            "specificity": [
                0,
                0,
                4
            ]
        },
        {
            "selector": "chart axis",
            "style": {
                "stroke": "#555555",
                "fill": "#555555"
            },
            "specificity": [
                0,
                0,
                2
            ]
        },
        {
            "selector": "chart axis label",
            "style": {
                "fill": "#666666"
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart axis title",
            "style": {
                "fill": "#cccccc"
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart axis[position=\"radial\"]",
            "style": {
                "fill": "none"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart axis[position=\"radial\"] label",
            "style": {
                "fill": "#ffffff",
                "textAlign": "center",
                "translate": {
                    "x": 0,
                    "y": -10
                }
            },
            "specificity": [
                0,
                1,
                3
            ]
        },
        {
            "selector": "chart[themeCls=\"radar\"]",
            "style": {
                "padding": 40
            },
            "specificity": [
                0,
                1,
                1
            ]
        },
        {
            "selector": "chart[themeCls=\"radar\"] series",
            "style": {
                "opacity": 0.4
            },
            "specificity": [
                0,
                1,
                2
            ]
        }
    ]
});
Ext.define('Ext.chart.theme.WorldData', {
    singleton: true,
    selectors: [
        {
            "selector": "chart",
            "style": {
                "colors": [
                    "#49080e",
                    "#49080e",
                    "#d7a400"
                ],
                "background": "#dbddd8"
            },
            "specificity": [
                0,
                0,
                1
            ]
        },
        {
            "selector": "chart series:highlight",
            "style": {
                "radius": 5,
                "stroke-width": 3,
                "stroke": "#ffffff"
            },
            "specificity": [
                0,
                1,
                2
            ]
        },
        {
            "selector": "chart axis",
            "style": {
                "stroke": "#c2c4be",
                "fill": "#c2c4be"
            },
            "specificity": [
                0,
                0,
                2
            ]
        },
        {
            "selector": "chart axis grid",
            "style": {
                "stroke": "#c2c4be"
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart axis label",
            "style": {
                "fill": "#909488"
            },
            "specificity": [
                0,
                0,
                3
            ]
        },
        {
            "selector": "chart axis title",
            "style": {
                "fill": "#43453e"
            },
            "specificity": [
                0,
                0,
                3
            ]
        }
    ]
});
