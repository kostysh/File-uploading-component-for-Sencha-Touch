/**
 * @class Ext.chart.Spark
 * @extends Ext.chart.AbstractChart
 *
 * The Spark Chart provides small sized charts. This class extends the {@link Ext.chart.AbstractChart} class
 * with default configuration options needed to create word-sized charts.
 *
 * Example:
 *
 * //create a line spark
 * var chart = new Ext.chart.Spark({
 *   store: store1,
 *   renderTo: 'glucose-chart',
 *   series: [{
 *     type: 'line',
 *     xField: 'name',
 *     yField: 'glucose',
 *     fill: true,
 *     style: {
 *       fill: '#777'
 *     }
 *   }]
 * });
 * chart.redraw();
 *
 * //create an area spark
 *          chart = new Ext.chart.Spark({
 *              store: store1,
 *              renderTo: 'respiration-chart',
 *              series: [{
 *                  type: 'line',
 *                  xField: 'name',
 *                  yField: 'respiration',
 *                  style: {
 *                      fill: '#777'
 *                  }
 *              }]
 *          });
 *
 *  chart.redraw();
 *
 * //create a column spark
 *          chart = new Ext.chart.Spark({
 *              store: store1,
 *              renderTo: 'temperature-chart',
 *              series: [{
 *                  type: 'column',
 *                  xField: 'name',
 *                  yField: 'temperature'
 *              }]
 *          });
 *
 * chart.redraw();
 *
 * //create an area spark
 *          chart = new Ext.chart.Spark({
 *              store: store1,
 *              renderTo: 'WBC-chart',
 *              series: [{
 *                  type: 'area',
 *                  xField: 'name',
 *                  yField: 'WBC'
 *              }]
 *          });
 *
 * chart.redraw();
 *
 * {@img Ext.chart.Spark/Ext.chart.Spark.png Ext.chart.Spark Spark visualization}
 *
 * In this example we create all the available types of spark charts: `line`, `column` and `area`. The options for each
 * of those series are the same than the ones defined in {@link Ext.chart.series.Line}, {@link Ext.chart.series.Column} and
 * {@link Ext.chart.series.Area}
 *
 */
Ext.define('Ext.chart.Spark', {
    extend: 'Ext.chart.AbstractChart',
    constructor: function (config) {
        var finalConfig = {},
            defaults = {
                line: {
                    xField: 'name',
                    yField: 'value',
                    axis: 'left',
                    showMarkers: false
                },
                column: {
                    gutter: 1,
                    groupGutter: 1,
                    xField: 'name',
                    yField: 'value',
                    axis: 'left'
                },
                area: {
                    gutter: 1,
                    xPadding: 0,
                    yPadding: 0,
                    groupGutter: 1,
                    xField: 'name',
                    yField: 'value',
                    axis: 'left'
                },
                chart: {
                    animate: false,
                    width: 100,
                    height: 20,
                    cls: 'x-spark',
                    insetPadding: {
                        left: 0,
                        bottom: 0,
                        top: 0,
                        right: 0
                    }
                }
            };

        finalConfig = Ext.apply(defaults.chart, config);

        if (typeof config.series == 'string') {
            config.series = [
                {
                    type: config.series
                }
            ];
        }

        finalConfig.series = [Ext.apply(defaults[config.series[0].type], config.series[0])];
        finalConfig.axes = [
            {
                hidden: true,
                type: 'numeric',
                fields: [finalConfig.series[0].yField]
            },
            {
                hidden: true,
                type: 'category',
                fields: [finalConfig.series[0].xField]
            }
        ];
        return this.callParent([finalConfig]);
    }
});
