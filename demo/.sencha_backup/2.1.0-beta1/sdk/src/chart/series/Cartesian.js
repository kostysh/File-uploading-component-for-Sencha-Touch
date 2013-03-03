/**
 * @class Ext.chart.series.Cartesian
 * @extends Ext.chart.series.Series
 *
 * Common base class for series implementations which plot values using x/y coordinates.
 *
 * @constructor
 */
Ext.define('Ext.chart.series.Cartesian', {
    extend: 'Ext.chart.series.Series',
    config: {
        /**
         * The field used to access the x axis value from the items from the data
         * source.
         *
         * @cfg {String} xField
         */
        xField: null,

        /**
         * The field used to access the y-axis value from the items from the data
         * source.
         *
         * @cfg {String} yField
         */
        yField: null,

        /**
         * @cfg {String} axis
         * The position of the axis to bind the values to. Possible values are 'left', 'bottom', 'top' and 'right'.
         * You must explicitly set this value to bind the values of the line series to the ones in the axis, otherwise a
         * relative scale will be used.
         */
        xAxis: null,
        yAxis: null
    },

    fieldNamesX: null,
    fieldNamesY: null,

    onAxesChanged: function (chart) {
        var me = this,
            fieldNamesX = this.fieldNamesX,
            fieldNamesY = this.fieldNamesY,
            axes, xField = [], yField = [],
            i, ln,
            isSide;

        axes = chart.getAxes();
        if (fieldNamesX) {
            for (i = 0, ln = fieldNamesX.length; i < ln; i++) {
                xField.push(me['get' + fieldNamesX[i] + 'Field']());
            }
        } else {
            xField = [me.getXField()];
        }

        if (fieldNamesY) {
            for (i = 0, ln = fieldNamesY.length; i < ln; i++) {
                yField.push(me['get' + fieldNamesY[i] + 'Field']());
            }
        } else {
            yField = [me.getYField()];
        }


        // TODO: consider more.
        axes.forEach(function (axis) {
            if (!axis.isCartesian) {
                return;
            }
            isSide = axis.isSide();
            if (isSide) {
                for (i = 0, ln = yField.length; i < ln; i++) {
                    if (axis.fieldsMap[yField[i]]) {
                        me.setYAxis(axis);
                        break;
                    }
                }
            } else {
                for (i = 0, ln = xField.length; i < ln; i++) {
                    if (axis.fieldsMap[xField[i]]) {
                        me.setXAxis(axis);
                        break;
                    }
                }
            }
        });
    },

    applyStyle: function (style) {
        var cls = Ext.ClassManager.get(Ext.ClassManager.getNameByAlias('sprite.' + this.seriesType));
        if (cls && cls.def) {
            style = cls.def.normalize(style);
        }
        return style;
    },

    coordinate: (function () {
        var coordinator = function (layout, items) {
            return function (x, field, idx) {
                return layout.getCoordFor(x, field, idx, items);
            };
        };

        return function (direction) {
            var me = this,
                directionName = (!direction || direction.toLowerCase() == 'x') ? 'X' : 'Y',
                axis = me['get' + directionName + 'Axis'](),
                field,
                store = me.getStore() || me.getChart() && me.getChart().getStore(),
                items = store.getData().items,
                length = items.length,
                min = Infinity, max = -Infinity,
                coord = axis ? coordinator(axis.getLayout(), items) : function (x, field, idx) { return +x; },
                value, i, ln, data,
                fieldNames = me['fieldNames' + direction] || [directionName],
                style = {};
            if (length) {
                for (var fieldId = 0; fieldId < fieldNames.length; fieldId++) {
                    field = me['get' + fieldNames[fieldId] + 'Field']();
                    data = [];
                    for (i = 0, ln = length; i < ln; i++) {
                        value = coord(items[i].get(field), field, i);
                        if (value < min) {
                            min = value;
                        } else if (value > max) {
                            max = value;
                        }
                        data[i] = value;
                    }
                    style['data' + fieldNames[fieldId]] = data;
                }
            }
            if (directionName == 'X') {
                me.dataRange[0] = min;
                me.dataRange[2] = max;
            } else {
                me.dataRange[1] = min;
                me.dataRange[3] = max;
            }

            style.dataRange = me.dataRange;

            me.getSprites()[0].setAttributes(Ext.applyIf(style, this.getStyle()));
        }
    })(),

    processData: function () {
        var me = this,
            xAxis = me.getXAxis(),
            yAxis = me.getYAxis();

        if (xAxis) {
            xAxis.processData(me);
        } else {
            me.coordinate('X');
        }
        if (yAxis) {
            yAxis.processData(me);
        } else {
            me.coordinate('Y');
        }
    },

    getMarkerSprites: function () {
        var me = this,
            chart = this.getChart(),
            sprites = me.getSprites(),
            marker = me.getMarker();
        if (marker) {
            marker.setStreamProvider(sprites[0]);
            return [marker];
        }
        return [];
    },

    getItemForPoint: function (x, y) {
        var me = this,
            sprite = me.getSprites()[0],
            imat = sprite.attr.inverseMatrix,
            dataX = sprite.attr.dataX,
            dataY = sprite.attr.dataY;
        if (dataX && dataY) {
            var positionLB = imat.transformPoint([x - 22, y - 22]),
                positionTR = imat.transformPoint([x + 22, y + 22]),
                left = Math.min(positionLB[0], positionTR[0]),
                right = Math.max(positionLB[0], positionTR[0]),
                top = Math.min(positionLB[1], positionTR[1]),
                bottom = Math.max(positionLB[1], positionTR[1]);
            for (var i = 0; i < dataX.length; i++) {
                if (left < dataX[i] && dataX[i] < right && top < dataY[i] && dataY[i] < bottom) {
                    return {
                        series: this,
                        index: i
                    };
                }
            }
        }
    },

    getSprites: function () {
        var me = this,
            chart = this.getChart(),
            animation = chart && chart.getAnimate();

        if (!chart) {
            return [];
        }

        if (this.sprites.length) {
            if (animation) {
                this.sprites[0].fx.setConfig(animation);
            }
            return this.sprites;
        }

        var surface = me.getSurface(),
            xAxis = me.getXAxis(),
            yAxis = me.getYAxis(),
            sprite,
            sprites = this.sprites;

        surface.setHighPrecision(xAxis && xAxis.needHighPrecision || yAxis && yAxis.needHighPrecision);
        if (!sprites.length) {
            sprites.map = {};
            sprite = surface.add({
                type: this.seriesType,
                id: this.getId() + '-stroke',
                scaling: {
                    centerX: 0,
                    centerY: 0
                }
            });
            sprites.push(sprite);
            if (sprite.setAggregator && xAxis.getAggregator) {
                if (xAxis.getAggregator) {
                    sprite.setAggregator({strategy: xAxis.getAggregator()});
                } else {
                    sprite.setAggregator({});
                }
            }
            sprite.fx.on('animationstart', 'onSpriteAnimationStart', this);
            sprite.fx.on('animationend', 'onSpriteAnimationEnd', this);
            sprites.map[sprite.id] = sprite;
        } else {
            sprite = sprites[0];
        }

        if (animation) {
            sprite.fx.setConfig(animation);
        }

        return sprites;
    },

    onSpriteAnimationStart: function (sprite) {
        this.fireEvent('animationstart', sprite);
    },

    onSpriteAnimationEnd: function (sprite) {
        this.fireEvent('animationend', sprite);
    },

    getXRange: function () {
        return [this.dataRange[0], this.dataRange[2]];
    },

    getYRange: function () {
        return [this.dataRange[1], this.dataRange[3]];
    }
});