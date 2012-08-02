/**
 * Cartesian sprite.
 */
Ext.define("Ext.chart.series.sprite.Cartesian", {
    extend: 'Ext.draw.sprite.Sprite',
    homogeneous: true,
    ascending: true,
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
                dataX: 'default'
            },
            defaults: {
                dataY: null,
                dataX: null,
                dataRange: null
            },
            dirtyTriggers: {
                dataX: 'dataX,bbox',
                dataY: 'dataY,bbox',
                dataRange: 'bbox'
            },
            updaters: {
                'dataX': function (attrs) {
                    this.processDataX();
                    if (!attrs.dirtyFlags['dataY']) {
                        attrs.dirtyFlags['dataY'] = [];
                    }
                    attrs.dirtyFlags['dataY'].push('dataY');
                },
                'dataY': function () {
                    this.processDataY();
                }
            }
        }
    },

    getIterator: function () {
        var me = this,
            attr = me.attr,
            elements = attr.matrix.elements,
            xx = elements[0],
            yy = elements[3],
            dx = elements[4],
            dy = elements[5],
            clip = this.clip,
            dataX = attr.dataX,
            dataY = attr.dataY;
        if (dataX == null || dataY == null) {
            return null;
        }
        var start = this.dataStart || 0,
            end = this.dataEnd || dataX.length - 1,
            i = start;

        return {
            reset: function () { i = start; },
            iterate: clip ? function () {
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
            } : function () {
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

    processDataY: Ext.emptyFn,

    processDataX: function () {
        var me = this,
            attr = me.attr,
            dx = attr.dataX,
            ascending,
            i, ln;
        if (dx) {
            ln = dx.length;
            ascending = true;
            for (i = 1; i < ln; i++) {
                if (dx[i] < dx[i - 1]) {
                    ascending = false;
                    break;
                }
            }
            if (!ascending) {
                throw 'Non-ascending line series not supported.';
            }
        }
    },

    getBBox: function (isWithoutTransform) {
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

    render: function (surface, ctx, region) {
        var me = this,
            attr = me.attr,
            inverseMatrix = attr.inverseMatrix.clone();

        if (attr.dataX == null) {
            return;
        }
        if (attr.dataY == null) {
            return;
        }

        if (inverseMatrix.getXY() || inverseMatrix.getYX()) {
            console.log('Cartesian Series sprite does not support rotation/sheering');
            return;
        }
        inverseMatrix.postpendMatrix(surface.inverseMatrix);
        var clip = inverseMatrix.transformList([
            [region[0] - 1, region[1] + region[3] + 1],
            [region[0] + region[2] + 1, region[1] - 1]
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
     * 
     * @param surface
     * @param ctx
     * @param clip
     * @param region
     */
    renderClipped: Ext.emptyFn
});