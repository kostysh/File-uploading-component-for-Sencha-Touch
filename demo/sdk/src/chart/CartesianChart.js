/**
 * @class Ext.chart.CartesianChart
 * @extends Ext.draw.Component
 * TODO(zhangbei): Documents
 * @xtype chart
 */

Ext.define('Ext.chart.CartesianChart', {

    extend: 'Ext.chart.AbstractChart',
    xtype: 'chart',
    alias: 'Ext.chart.Chart',

    onThicknessChange: function () {
        var me = this;
        if (me.delayThicknessChanged) {
            me.thicknessChanged = true;
        } else {
            me.scheduleLayout();
        }
    },

    updateAxes: function (newAxes, oldAxes) {
        var me = this;
        if (oldAxes) {
            oldAxes.forEach(function (axis) {
                axis.un('thicknesschanged', 'onThicknessChange', me);
            });
        }
        this.callParent([newAxes, oldAxes]);
        if (newAxes) {
            newAxes.forEach(function (axis) {
                axis.on('thicknesschanged', 'onThicknessChange', me);
            });
        }
    },

    /**
     * Layout the axes and series.
     */
    layout: function () {
        try {
            this.resizing = true;
            var me = this,
                axes = me.getAxes(), axis,
                serieses = me.getSeries(), series,
                axisSurface, thickness,
                size = me.element.getSize(),
                padding = me.getInsetPadding(),
                width = size.width,
                height = size.height,
                innerPadding = me.getInnerPadding(),
                surface, overlaySurface,
                shrinkBox = {
                    top: padding.top,
                    left: padding.left,
                    right: padding.right,
                    bottom: padding.bottom
                },
                mainRegion, innerWidth, innerHeight,
                elements, floating, matrix, i, ln;

            for (i = 0; i < axes.length; i++) {
                axis = axes[i];
                axisSurface = axis.getSurface();
                matrix = axisSurface.matrix;
                elements = matrix.elements;
                floating = axis.getStyle && axis.getStyle() && axis.getStyle().floating;
                axisSurface.setRegion([0, 0, width, height]);
                thickness = axis.getThickness();
                switch (axis.getPosition()) {
                    case 'top':
                        elements[5] = shrinkBox.top;
                        break;
                    case 'bottom':
                        elements[5] = height - (shrinkBox.bottom + thickness);
                        break;
                    case 'left':
                        elements[4] = shrinkBox.left;
                        break;
                    case 'right':
                        elements[4] = width - (shrinkBox.right + thickness);
                        break;
                }
                matrix.inverse(axisSurface.inverseMatrix);
                if (!floating) {
                    shrinkBox[axis.getPosition()] += thickness;
                }
            }

            innerWidth = width - shrinkBox.left - shrinkBox.right;
            innerHeight = height - shrinkBox.top - shrinkBox.bottom;

            mainRegion = [shrinkBox.left, shrinkBox.top, innerWidth, innerHeight];

            shrinkBox.left += innerPadding.left;
            shrinkBox.top += innerPadding.top;
            shrinkBox.right += innerPadding.right;
            shrinkBox.bottom += innerPadding.bottom;

            innerWidth = width - shrinkBox.left - shrinkBox.right;
            innerHeight = height - shrinkBox.top - shrinkBox.bottom;

            me.setMainRegion(mainRegion);
            me.getSurface('main').setRegion(mainRegion);

            for (i = 0; i < axes.length; i++) {
                axis = axes[i];
                axisSurface = axis.getSurface();
                matrix = axisSurface.matrix;
                elements = matrix.elements;
                switch (axis.getPosition()) {
                    case 'top':
                    case 'bottom':
                        elements[4] = shrinkBox.left;
                        axis.setLength(innerWidth);
                        break;
                    case 'left':
                    case 'right':
                        elements[5] = shrinkBox.top;
                        axis.setLength(innerHeight);
                        break;
                }
            }

            for (i = 0, ln = serieses.length; i < ln; i++) {
                series = serieses[i];
                surface = series.getSurface();
                surface.setRegion(mainRegion);
                surface.matrix.elements[4] = innerPadding.left;
                surface.matrix.elements[5] = innerPadding.top;
                surface.matrix.inverse(surface.inverseMatrix);
                overlaySurface = series.getOverlaySurface();
                overlaySurface.setRegion([0, 0, width, height]);
                overlaySurface.matrix.elements[4] = shrinkBox.left;
                overlaySurface.matrix.elements[5] = shrinkBox.top;
                overlaySurface.matrix.inverse(overlaySurface.inverseMatrix);
            }
            me.redraw();
            me.onPlaceWatermark();
        } finally {
            this.resizing = false;
        }
    },

    /**
     * @inheritDocs
     */
    redraw: function () {
        var me = this,
            series = me.getSeries(),
            axes = me.getAxes(),
            region = me.getMainRegion(),
            innerPadding = me.getInnerPadding(),
            innerWidth, innerHeight,
            left, right, top, bottom, dx, dy, cx, cy, i, j,
            sprites, range, xRange, yRange, isSide, attr,
            axisX, axisY, visibleRange;

        if (!region) {
            return;
        }
        innerWidth = region[2] - innerPadding.left - innerPadding.right;
        innerHeight = region[3] - innerPadding.top - innerPadding.bottom;
        for (i = 0; i < series.length; i++) {
            if ((axisX = series[i].getXAxis())) {
                visibleRange = axisX.getVisibleRange();
                xRange = axisX.getRange();
                xRange = [xRange[0] + (xRange[1] - xRange[0]) * visibleRange[0], xRange[0] + (xRange[1] - xRange[0]) * visibleRange[1]];
            } else {
                xRange = series[i].getXRange();
            }

            if ((axisY = series[i].getYAxis())) {
                visibleRange = axisY.getVisibleRange();
                yRange = axisY.getRange();
                yRange = [yRange[0] + (yRange[1] - yRange[0]) * visibleRange[0], yRange[0] + (yRange[1] - yRange[0]) * visibleRange[1]];
            } else {
                yRange = series[i].getYRange();
            }
            dx = (xRange[1] - xRange[0]) * 0.5;
            dy = (yRange[1] - yRange[0]) * 0.5;
            cx = (xRange[1] + xRange[0]) * 0.5;
            cy = (yRange[1] + yRange[0]) * 0.5;
            left = cx - dx;
            right = cx + dx;
            top = cy - dy;
            bottom = cy + dy;
            attr = {
                translationX: -left * innerWidth / (right - left),
                translationY: top * innerHeight / (bottom - top) + innerHeight,
                scalingX: innerWidth / (right - left),
                scalingY: -innerHeight / (bottom - top),
                scalingCenterX: 0,
                scalingCenterY: 0
            };
            sprites = series[i].getSprites();
            for (j = 0; j < sprites.length; j++) {
                sprites[j].setAttributes(attr);
            }

            sprites = series[i].getMarkerSprites();
            for (j = 0; j < sprites.length; j++) {
                sprites[j].setDirty(true);
            }
        }

        for (i = 0; i < axes.length; i++) {
            isSide = axes[i].isSide();
            sprites = axes[i].getSprites();
            range = axes[i].getRange();
            visibleRange = axes[i].getVisibleRange();
            range = [range[0] + (range[1] - range[0]) * visibleRange[0], range[0] + (range[1] - range[0]) * visibleRange[1]];
            dx = (range[1] - range[0]) * 0.5;
            dy = (range[1] - range[0]) * 0.5;
            cx = (range[1] + range[0]) * 0.5;
            cy = (range[1] + range[0]) * 0.5;
            left = cx - dx;
            right = cx + dx;
            top = cy - dy;
            bottom = cy + dy;
            if (isSide) {
                attr = {
                    translation: {
                        x: 0,
                        y: top * innerHeight / (bottom - top) + innerHeight
                    },
                    scaling: {
                        x: 1,
                        y: -innerHeight / (bottom - top),
                        centerY: 0,
                        centerX: 0
                    }
                };
            } else {
                attr = {
                    translation: {
                        x: -left * innerWidth / (right - left),
                        y: 0
                    },
                    scaling: {
                        x: innerWidth / (right - left),
                        y: 1,
                        centerX: 0,
                        centerY: 0
                    }
                };
            }
            for (j = 0; j < sprites.length; j++) {
                sprites[j].setAttributes(attr);
            }
        }
        me.renderFrame();
    },

    onPlaceWatermark: function () {
        var region0 = this.element.getBox(),
            region = this.getSurface ? this.getSurface('main').getRegion() : this.getItems().get(0).getRegion();
        this.watermarkElement.setStyle({
            right: Math.round(region0.width - (region[2] + region[0])) + 'px',
            bottom: Math.round(region0.height - (region[3] + region[1])) + 'px'
        });
    }
});