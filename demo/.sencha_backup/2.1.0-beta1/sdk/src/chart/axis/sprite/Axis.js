/**
 *
 */
Ext.define("Ext.chart.axis.sprite.Axis", {
    extend: 'Ext.draw.sprite.Sprite',
    requires: ['Ext.draw.sprite.Text'],

    inheritableStatics: {
        def: {
            processors: {
                grid: 'bool',
                axisLine: 'bool',
                labelInSpan: 'bool',
                minorTicks: 'bool',
                minorTickSize: 'number',
                majorTicks: 'bool',
                majorTickSize: 'number',
                length: 'number',
                visibleRange: 'default',
                docked: 'string',
                minStepSize: 'number',
                estStepSize: 'number',
                min: 'number',
                max: 'number',
                data: 'default',
                enlargeEstStepSizeByText: 'bool'
            },

            defaults: {
                grid: false,
                axisLine: true,
                labelInSpan: false,
                minorTicks: false,
                minorTickSize: 3,
                majorTicks: true,
                majorTickSize: 5,
                length: 10,
                visibleRange: [0, 1],
                docked: 'left',
                minStepSize: 0,
                estStepSize: 30,
                min: 0,
                max: 1,
                data: null,
                // Override default
                strokeStyle: 'black',
                enlargeEstStepSizeByText: true
            },

            dirtyTriggers: {
                minorTickSize: 'bbox',
                majorTickSize: 'bbox',
                docked: 'bbox,layout',
                axisLine: 'bbox,layout',
                length: 'bbox,layout',
                min: 'layout',
                max: 'layout',
                minStepSize: 'layout',
                estStepSize: 'layout',
                data: 'layout',
                visibleRange: 'layout',
                enlargeEstStepSizeByText: 'layout'
            },
            updaters: {
                'layout': function () {
                    this.doLayout();
                }
            }
        }
    },


    config: {
        title: '',

        label: null,

        layout: null,

        segmenter: null,

        renderer: null,

        layoutContext: null
    },

    thickness: 0,

    applyTitle: function (title, oldTitle) {
        if (!oldTitle) {
            oldTitle = new Ext.draw.sprite.Text();
        }
        oldTitle.setAttributes(title);
        return oldTitle;
    },

    getBBox: function (isWithoutTransform) {
        var attr = this.attr,
            docked = attr.docked,
            vertical = docked == 'left' || docked == 'right',
            bbox = attr.bbox;
        if (!bbox.transform) {
            if (vertical) {
                bbox.transform = {x: 0, y: 0, width: this.thickness, height: attr.length};
            } else {
                bbox.transform = {x: 0, y: 0, width: attr.length, height: this.thickness};
            }
        }

        if (!bbox.plain) {
            bbox.plain = attr.inverseMatrix.transformBBox(bbox.transform);
        }

        if (isWithoutTransform) {
            return bbox.plain;
        } else {
            return bbox.transform;
        }
    },

    doLayout: function () {
        var me = this,
            attr = me.attr,
            layout = me.getLayout(),
            context = {
                attr: attr,
                segmenter: me.getSegmenter()
            };
        if (layout) {
            layout.calculateLayout(context);
            me.setLayoutContext(context);
        }
    },

    iterate: function (snaps) {
        var start = snaps.min < snaps.from ? -1 : 0,
            stop = snaps.max > snaps.to ? snaps.steps + 1 : snaps.steps,
            iterator = {
                current: start,
                hasNext: function () {
                    return this.current <= stop;
                },
                get: function () {
                    if (this.current < 0) {
                        return snaps.min;
                    }
                    if (this.current > snaps.steps) {
                        return snaps.max;
                    }
                    return snaps.get(this.current);
                },
                step: function () {
                    this.current++;
                }
            };
        if (snaps.getLabel) {
            iterator.getLabel = function () {
                if (this.current < 0) {
                    return snaps.min;
                }
                if (this.current > snaps.steps) {
                    return snaps.max;
                }
                return snaps.getLabel(this.current);
            };
        } else {
            iterator.getLabel = iterator.get;
        }
        return iterator;
    },

    renderTicks: function (surface, ctx, layout) {
        var me = this,
            attr = me.attr,
            docked = attr.docked,
            matrix = attr.matrix,
            xx = matrix.getXX(),
            dx = matrix.getDX(),
            yy = matrix.getYY(),
            dy = matrix.getDY(),
            thickness = me.thickness,
            majorTicks = layout.majorTicks,
            majorTickSize = attr.majorTickSize,
            minorTicks = layout.minorTicks,
            minorTickSize = attr.minorTickSize,
            i, step, it, position, ln;

        if (majorTicks) {
            switch (docked) {
                case 'right':
                    for (it = me.iterate(majorTicks); it.hasNext(); it.step()) {
                        position = Math.round(it.get() * yy + dy) + 0.5;
                        ctx.moveTo(0, position);
                        ctx.lineTo(majorTickSize, position);
                    }
                    break;
                case 'left':
                    for (it = me.iterate(majorTicks); it.hasNext(); it.step()) {
                        position = Math.round(it.get() * yy + dy) + 0.5;
                        ctx.moveTo(thickness - majorTickSize, position);
                        ctx.lineTo(thickness, position);
                    }
                    break;
                case 'bottom':
                    for (it = me.iterate(majorTicks); it.hasNext(); it.step()) {
                        position = Math.round(it.get() * xx + dx) - 0.5;
                        ctx.moveTo(position, 0);
                        ctx.lineTo(position, majorTickSize);
                    }
                    break;
                case 'top':
                    for (it = me.iterate(majorTicks); it.hasNext(); it.step()) {
                        position = Math.round(it.get() * xx + dx) - 0.5;
                        ctx.moveTo(position, thickness);
                        ctx.lineTo(position, thickness - majorTickSize);
                    }
                    break;
            }
        }
    },

    renderLabels: function (surface, ctx, layout) {
        var me = this,
            attr = me.attr,
            docked = attr.docked,
            matrix = attr.matrix,
            xx = matrix.getXX(),
            dx = matrix.getDX(),
            yy = matrix.getYY(),
            dy = matrix.getDY(),
            thickness = me.thickness,
            majorTicks = layout.majorTicks,
            vertical = docked == 'left' || docked == 'right',
            padding = Math.max(attr.majorTickSize || 0, attr.minorTickSize || 0),
            label = this.getLabel(), font,
            labelText,
            textSize = 0, textCount = 0,
            segmenter = layout.segmenter,
            renderer = this.getRenderer() || function (x) {return x + '';},
            labelInverseMatrix, lastBBox = null, bbox, fly, text,
            it, position;

        if (majorTicks && label && !label.attr.hidden) {
            font = label.attr.font;
            if (ctx.font !== font) {
                ctx.font = font;
            } // This can profoundly improve performance.
            label.setAttributesCanonical({translationX: 0, translationY: 0});
            label.applyTransformations();
            labelInverseMatrix = label.attr.inverseMatrix.elements.slice(0);
            label.setAttributesCanonical({
                left: {
                    textAlign: 'right',
                    textBaseline: 'center',
                    translationX: Math.round(thickness - padding)
                },
                right: {
                    textAlign: 'left',
                    textBaseline: 'center',
                    translationX: Math.round(padding)
                },
                bottom: {
                    textAlign: 'center',
                    textBaseline: 'top',
                    translationY: Math.round(padding)
                },
                top: {
                    textAlign: 'center',
                    textBaseline: 'bottom',
                    translationY: Math.round(thickness - padding)
                }
            }[docked]);

            thickness = 0;

            // TODO: there are better ways to detect collision.
            if (vertical) {
                for (it = this.iterate(majorTicks); it.hasNext(); it.step()) {
                    position = it.get();
                    labelText = it.getLabel();
                    if (labelText === undefined) {
                        continue;
                    }
                    text = renderer.call(this, segmenter.renderer(labelText, layout), layout);
                    label.setAttributesCanonical({
                        text: text ? text.toString() : '',
                        translationY: Math.round(position * yy + dy)
                    });
                    label.applyTransformations();
                    fly = Ext.draw.Matrix.fly(label.attr.matrix.elements.slice(0));
                    bbox = fly.prepend.apply(fly, labelInverseMatrix).transformBBox(label.getBBox(true));
                    if (lastBBox && !Ext.draw.Draw.isBBoxIntersect(bbox, lastBBox)) {
                        continue;
                    }
                    thickness = Math.max(thickness, label.getBBox(true).width + padding);
                    surface.renderSprite(label);
                    lastBBox = bbox;
                    textSize += bbox.height;
                    textCount++;
                }
            } else {
                for (it = this.iterate(majorTicks); it.hasNext(); it.step()) {
                    position = it.get();
                    labelText = it.getLabel();
                    if (labelText === undefined) {
                        continue;
                    }
                    text = renderer.call(this, segmenter.renderer(labelText, layout), layout);
                    label.setAttributesCanonical({
                        text: text ? text.toString() : '',
                        translationX: Math.round(position * xx + dx)
                    });
                    label.applyTransformations();
                    fly = Ext.draw.Matrix.fly(label.attr.matrix.elements.slice(0));
                    bbox = fly.prepend.apply(fly, labelInverseMatrix).transformBBox(label.getBBox(true));
                    if (lastBBox && !Ext.draw.Draw.isBBoxIntersect(bbox, lastBBox)) {
                        continue;
                    }
                    thickness = Math.max(thickness, label.getBBox(true).height + padding);
                    surface.renderSprite(label);
                    lastBBox = bbox;
                    textSize += bbox.width;
                    textCount++;
                }
            }

            if (attr.enlargeEstStepSizeByText && textCount) {
                textSize /= textCount;
                textSize += padding;
                textSize *= 2;
                if (attr.estStepSize < textSize) {
                    attr.estStepSize = textSize;
                }
            }

            if (me.thickness != thickness) {
                me.thickness = thickness;
                attr.bbox.plain = false;
                attr.bbox.transform = false;
                me.fireEvent('thicknesschanged', me);
            }
        }
    },

    renderAxisLine: function (surface, ctx, layout) {
        var me = this,
            attr = me.attr,
            docked = attr.docked,
            length = attr.length,
            thickness = Math.floor(me.thickness);
        if (attr.axisLine) {
            switch (docked) {
                case 'left':
                    ctx.moveTo(thickness - 0.5, 0);
                    ctx.lineTo(thickness - 0.5, length + 1);
                    break;
                case 'right':
                    ctx.moveTo(0.5, 0);
                    ctx.lineTo(0.5, length + 1);
                    break;
                case 'bottom':
                    ctx.moveTo(0, 0.5);
                    ctx.lineTo(length, 0.5);
                    break;
                case 'top':
                    ctx.moveTo(0, thickness - 0.5);
                    ctx.lineTo(length + 1, thickness - 0.5);
                    break;
            }
        }
    },

    renderGridLines: function (surface, ctx, layout) {
        var me = this,
            attr = me.attr,
            docked = attr.docked,
            length = attr.length,
            start, end,
            majorTicks = layout.majorTicks,
            it, position;
        if (attr.grid) {
            if (majorTicks) {
                if (docked == 'left' || docked == 'right') {
                    for (it = this.iterate(majorTicks); it.hasNext(); it.step()) {
                        position = it.get();
                    }
                } else {
                    for (it = this.iterate(majorTicks); it.hasNext(); it.step()) {
                        position = it.get();
                    }
                }
            }
        }
    },

    render: function (surface, ctx, region) {
        var me = this,
            layout = me.getLayoutContext();

        if (layout) {
            ctx.beginPath();
            me.renderTicks(surface, ctx, layout);
            me.renderAxisLine(surface, ctx, layout);
            me.renderGridLines(surface, ctx, layout);
            ctx.stroke();
            me.renderLabels(surface, ctx, layout);
        }
    }
});