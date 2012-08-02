/**
 * @class Ext.chart.series.Pie
 * @extends Ext.chart.series.Series
 *
 * Creates a Pie Chart. A Pie Chart is a useful visualization technique to display quantitative information for different
 * categories that also have a meaning as a whole.
 * As with all other series, the Pie Series must be appended in the *series* Chart array configuration. See the Chart
 * documentation for more information. A typical configuration object for the pie series could be:
 *
 * {@img Ext.chart.series.Pie/Ext.chart.series.Pie.png Ext.chart.series.Pie chart series}
 *
 *     var store = new Ext.data.JsonStore({
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             {'name':'metric one', 'data1':10, 'data2':12, 'data3':14, 'data4':8, 'data5':13},
 *             {'name':'metric two', 'data1':7, 'data2':8, 'data3':16, 'data4':10, 'data5':3},
 *             {'name':'metric three', 'data1':5, 'data2':2, 'data3':14, 'data4':12, 'data5':7},
 *             {'name':'metric four', 'data1':2, 'data2':14, 'data3':6, 'data4':1, 'data5':23},
 *             {'name':'metric five', 'data1':27, 'data2':38, 'data3':36, 'data4':13, 'data5':33}
 *         ]
 *     });
 *
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         store: store,
 *         theme: 'Base:gradients',
 *         series: [{
 *             type: 'pie',
 *             angleField: 'data1',
 *             showInLegend: true,
 *             tips: {
 *               trackMouse: true,
 *               width: 140,
 *               height: 28,
 *               renderer: function(storeItem, item) {
 *                 //calculate and display percentage on hover
 *                 var total = 0;
 *                 store.each(function(rec) {
 *                     total += rec.get('data1');
 *                 });
 *                 this.setTitle(storeItem.get('name') + ': ' + Math.round(storeItem.get('data1') / total * 100) + '%');
 *               }
 *             },
 *             highlight: {
 *               margin: 20
 *             },
 *             label: {
 *                 field: 'name',
 *                 display: 'rotate',
 *                 contrast: true,
 *                 font: '18px Arial'
 *             }
 *         }]
 *     });
 *
 * In this configuration we set `pie` as the type for the series, set an object with specific style properties for highlighting options
 * (triggered when hovering elements). We also set true to `showInLegend` so all the pie slices can be represented by a legend item.
 * We set `data1` as the value of the field to determine the angle span for each pie slice. We also set a label configuration object
 * where we set the field name of the store field to be renderer as text for the label. The labels will also be displayed rotated.
 * We set `contrast` to `true` to flip the color of the label if it is to similar to the background color. Finally, we set the font family
 * and size through the `font` parameter.
 *
 * @xtype pie
 */
Ext.define('Ext.chart.series.Pie', {
    extend: 'Ext.chart.series.Polar',
    requires: [
        'Ext.draw.sprite.PieSlice'
    ],
    type: 'pie',
    seriesType: 'pie',
    alias: 'series.pie',

    config: {
        /**
         * @cfg {Number} labelOverflowPadding
         * Extra distance value for which the labelOverflow listener is triggered.
         */
        labelOverflowPadding: 10,

        highlightCfg: {
            margin: 20
        },


        /**
         * @cfg {String} angleField
         * The store record field name to be used for the pie angles.
         * The values bound to this field name must be positive real numbers.
         * This parameter is required.
         */
        field: false,

        /**
         * @cfg {String} lengthField
         * The store record field name to be used for the pie slice lengths.
         * The values bound to this field name must be positive real numbers.
         * This parameter is optional.
         */
        lengthField: false,

        /**
         * @cfg {Boolean/Number} donut
         * Whether to set the pie chart as donut chart.
         * Default's false. Can be set to a particular percentage to set the radius
         * of the donut chart.
         */
        donut: false
    },

    processData: function () {
        var me = this,
            chart = me.getChart(),
            store = me.getStore() || me.getChart() && me.getChart().getStore(),
            items = store.getData().items,
            length = items.length,
            field = me.getField(),
            value, sum = 0, ratio,
            summation = [],
            lengths = [], i,
            sprites = this.getSprites(),
            sprite,
            twoPie = Math.PI * 2,
            lastAngle;
        for (i = 0; i < length; i++) {
            value = items[i].get(field);
            sum += value;
            summation[i] = sum;
        }
        if (sum == 0) {
            return [
                summation,
                length
            ];
        }
        ratio = 2 * Math.PI / sum;
        for (i = 0; i < length; i++) {
            summation[i] *= ratio;
        }

        for (i = 0, lastAngle = 0; i < length; i++) {
            sprite = sprites[i];
            sprite.setAttributes({
                globalAlpha: 1,
                startAngle: lastAngle,
                endAngle: summation[i]
            });
            lastAngle = summation[i];
        }

        // Hide the others
        for (i = length; i < sprites.length; i++) {
            sprite = sprites[i];
            sprite.setAttributes({
                globalAlpha: 0,
                startAngle: twoPie,
                endAngle: twoPie
            });

        }
    },

    getSprites: function () {
        var me = this,
            chart = this.getChart(),
            surface = me.getSurface(),
            store = me.getStore() || me.getChart() && me.getChart().getStore(),
            items = store.getData().items,
            length = items.length,
            animation = chart && chart.getAnimate(),
            center = me.getCenter(),
            offsetX = me.getOffsetX(),
            offsetY = me.getOffsetY(),
            radius = me.getRadius(),
            donut = me.getDonut(),
            twoPie = 2 * Math.PI,
            sprite, i;

        if (!chart) {
            return [];
        }

        for (i = 0; i < length; i++) {
            sprite = me.sprites[i];
            if (!sprite) {
                sprite = surface.add({
                    type: 'pieslice',
                    centerX: center[0] + offsetX,
                    centerY: center[1] + offsetY,
                    startRho: radius * donut * 0.01, // Percentage
                    endRho: radius,
                    startAngle: twoPie,
                    endAngle: twoPie
                });
                me.sprites.push(sprite);
            }
            if (animation) {
                sprite.fx.setConfig(animation);
                sprite.setAttributes(Ext.applyIf({
                    centerX: center[0] + offsetX,
                    centerY: center[1] + offsetY,
                    startRho: radius * donut * 0.01, // Percentage
                    endRho: radius
                }, this.getStyleByIndex(i)));
            }
        }

        return me.sprites;
    }
});

