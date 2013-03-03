/**
 * Polar sprite.
 */
Ext.define("Ext.chart.series.sprite.Polar", {
    extend: 'Ext.draw.sprite.Sprite',
    inheritableStatics: {
        def: {
            processors: {
                dataRange: 'default',
                dataY: function(n) {
                    if (n instanceof Float32Array) {
                        return n;
                    } else if (n) {
                        return new Float32Array(n);
                    }
                },
                dataX: 'default',
                centerX: 'number',
                centerY: 'number',
                radius: 'number'
            },
            defaults: {
                dataY: null,
                dataX: null,
                dataRange: null,
                centerX: 0,
                centerY: 0,
                radius: 0
            },
            dirtyTriggers: {
                dataX: 'bbox',
                dataY: 'bbox',
                dataRange: 'bbox',
                centerX: 'bbox',
                centerY: 'bbox',
                radius: 'bbox'
            }
        }
    },

    getIterator: function() {
        var me = this,
            attr = me.attr,
            elements = attr.matrix.elements,
            xx = elements[0],
            yy = elements[3],
            dx = elements[4],
            dy = elements[5],
            clip = this.clip,
            dataX = attr.dataX,
            dataY = attr.dataY,
            start = this.dataStart || 0,
            end = this.dataEnd || dataX.length - 1,
            i = start;

        return {
            reset: function() { i = start; },
            iterate: clip ? function() {
                if (i > end) {
                    return null;
                } else {
                    var x, y;
                    while (i <= end) {
                        x = dataX[i];
                        y = dataY[i];
                        if (clip[0] <= x && x <= clip[2] && clip[1] <= y && y <= clip[3]) {
                            break;
                        }
                        i++;
                    }
                    i++;
                    return {
                        translationX: x * xx + dx,
                        translationY: y * yy + dy
                    }
                }
            } : function() {
                if (i > end) {
                    return null;
                } else {
                    return {
                        translationX: dataX[i] * xx + dx,
                        translationY: dataY[i++] * yy + dy
                    }
                }
            }
        }
    },

    getBBox: function(isWithoutTransform) {
        var attr = this.attr,
            matrix = attr.matrix,
            dataRange = attr.dataRange;
        if (dataRange) {
            if (isWithoutTransform) {
                return {
                    x: dataRange[0],
                    y: dataRange[1],
                    width: dataRange[2] - dataRange[0],
                    height: dataRange[3] - dataRange[1]
                };
            } else {
                return matrix.transformBBox({
                    x: dataRange[0],
                    y: dataRange[1],
                    width: dataRange[2] - dataRange[0],
                    height: dataRange[3] - dataRange[1]
                }, 0);
            }
        } else {
            return {x: 0, y: 0, width: 1, height: 1};
        }
    },

    render: function(surface, ctx, region) {
        var me = this,
            regionWidth = region[2],
            regionHeight = region[3],
            attr = me.attr,
            inverseMatrix = attr.inverseMatrix.clone(),
            dataX = attr.dataX;

        if (inverseMatrix.getXY() || inverseMatrix.getYX()) {
            console.log('Cartesian Series sprite does not support rotation/sheering');
            return;
        }
        inverseMatrix.postpendMatrix(surface.inverseMatrix);
        var clip = inverseMatrix.transformList([
            [-1, regionHeight + 1],
            [regionWidth + 1, -1]
        ]);

        clip = clip[0].concat(clip[1]);
        if (clip[2] < clip[0]) {
            console.log('Cartesian Series sprite does not supports flipped X.');
            // TODO: support it
            return;
        }
        me.clip = clip;
        me.renderClipped(surface, ctx, clip, region);
    },

    /**
     * region is [left, top, right, bottom]
     */
    renderClipped: function(surface, ctx, clip, region) {

    }
});