/**
 * Cartesian sprite.
 */
Ext.define("Ext.chart.series.sprite.Radar", {
    alias: 'sprite.radar',
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
                dataX: 'default',
                centerX: "number",
                centerY: "number",
                startAngle: "number",
                endAngle: "number",
                startRho: "number",
                endRho: "number"
            },
            defaults: {
                dataY: null,
                dataX: null,
                dataRange: null,
                centerX: 0,
                centerY: 0,
                startAngle: 0,
                endAngle: Math.PI,
                startRho: 0,
                endRho: 150
            },
            dirtyTriggers: {
                dataX: 'bbox',
                dataY: 'bbox',
                dataRange: 'bbox',
                centerX: "bbox",
                centerY: "bbox",
                startAngle: "bbox",
                endAngle: "bbox",
                startRho: "bbox",
                endRho: "bbox"
            }
        }
    },

    getBBox: function (isWithoutTransform) {
        var attr = this.attr,
            matrix = attr.matrix,
            bbox = attr.bbox;
        if (!bbox.plain) {
            bbox.plain = {
                x: attr.centerX - attr.endRho,
                y: attr.centerY + attr.endRho,
                width: attr.endRho * 2,
                height: attr.endRho * 2
            };
        }
        if (isWithoutTransform) {
            return bbox.plain
        } else {
            if (!bbox.transform) {
                bbox.transform = matrix.transformBBox(bbox.plain, 0)
            }
            return bbox.transform;
        }
    },

    render: function (surface, ctx, region) {
        var me = this,
            attr = me.attr,
            centerX = attr.centerX,
            centerY = attr.centerY,
            dataRange = attr.dataRange,
            minX = dataRange[0],
            minY = dataRange[1],
            maxX = dataRange[2],
            maxY = dataRange[3],
            dataX = attr.dataX,
            dataY = attr.dataY,
            endRho = attr.endRho,
            startRho = attr.startRho,
            i, length = dataX.length,
            x, y, r, th;
        ctx.beginPath();
        for (i = 0; i < length; i++) {
            x = dataX[i];
            y = dataY[i];
            th = (x - minX) / (maxX - minX) * 2 * Math.PI;
            r = y / maxY * (endRho - startRho) + startRho;
            ctx.lineTo(centerX + Math.cos(th) * r, centerY + Math.sin(th) * r);
        }
        ctx.closePath();
        ctx.fillStroke(attr);
    }
});