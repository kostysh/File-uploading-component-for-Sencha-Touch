/**
 * Stacked cartesian sprite.
 */
Ext.define("Ext.chart.series.sprite.StackedCartesian", {
    extend: 'Ext.chart.series.sprite.Cartesian',
    homogeneous: true,
    ascending: true,
    inheritableStatics: {
        def: {
            processors: {
                dataY: function (n) {
                    if (n) {
                        for (var i = 0; i < n.length; i++) {
                            var arr = n[i];
                            if (arr instanceof Float32Array) {
                                n[i] = arr;
                            } else if (arr) {
                                n[i] = new Float32Array(arr);
                            }
                        }
                        return n;
                    }
                }
            },
            defaults: {
                dataY: null,
                coeff: null
            },
            dirtyFlags: {
                coeff: 'dataY,bbox'
            },
            updaters: {
                'dataY': function () {
                    this.processDataY();
                }
            }
        }
    },

    processDataY: function () {
        var me = this,
            attr = me.attr,
            dx = attr.dataX,
            dys = attr.dataY,
            ys,
            homogeneous, ascending,
            i, ln, min, max;
        if (dx) {
            if (dx.length != dys[0].length) {
                throw 'Illegal data.';
            }
            ys = dys.length;
            ln = dx.length;
            homogeneous = true;
            ascending = true;
            for (i = 1; i < ln; i++) {
                if (dx[i] < dx[i - 1]) {
                    ascending = false;
                } else if (i > 1 && Math.abs((dx[i - 1] - dx[i]) - ( dx[i - 2] - dx[i - 1])) > 1e5) {
                    homogeneous = false;
                }
            }
            me.homogeneous = homogeneous;
            if (!ascending) {
                throw 'Non-ascending line series not supported.';
            }
            min = max = 0;
            for (i = 0; i < ln; i++) {
                var posSum = 0, negSum = 0;
                for (var j = 0; j < ys; j++) {
                    var val = dys[j][i];
                    if (val >= 0) {
                        posSum += val;
                    } else {
                        negSum += val;
                    }
                    if (posSum > max) {
                        max = posSum;
                    }
                    if (negSum < min) {
                        min = negSum;
                    }
                }
            }
            me.min = min;
            me.max = max;
        }
    },

    /**
     * region is [left, top, right, bottom]
     */
    renderClipped: function (surface, ctx, clip, region) {

    }
});