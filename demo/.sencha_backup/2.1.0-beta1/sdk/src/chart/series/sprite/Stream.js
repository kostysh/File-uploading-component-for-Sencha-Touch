Ext.define("Ext.chart.series.sprite.Stream", {
    alias: 'sprite.stripe',
    extend: 'Ext.draw.sprite.Sprite',
    inheritableStatics: {
        def: {
            processors: {
                dataRange: 'default',
                dataY: function (n) {
                    if (n instanceof Float32Array) {
                        return n;
                    } else if (n) {
                        return new Float32Array(n);
                    }
                },
                dataHeight: function (n) {
                    if (n instanceof Float32Array) {
                        return n;
                    } else if (n) {
                        return new Float32Array(n);
                    }
                },
                dataX: 'default'
            }
        }
    }
});