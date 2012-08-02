/**
 * @class Ext.chart.series.Area
 * @extends Ext.chart.series.Cartesian
 *
 * <p>
 *    Creates a Stacked Area Chart. The stacked area chart is useful when displaying multiple aggregated layers of information.
 *    As with all other series, the Area Series must be appended in the *series* Chart array configuration. See the Chart
 *    documentation for more information. A typical configuration object for the area series could be:
 * </p>
 * {@img Ext.chart.series.Area/Ext.chart.series.Area.png Ext.chart.series.Area chart series}
 * <pre><code>
 * var store = new Ext.data.JsonStore({
 *      fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *      data: [
 *          {'name':'metric one', 'data1':10, 'data2':12, 'data3':14, 'data4':8, 'data5':13},
 *          {'name':'metric two', 'data1':7, 'data2':8, 'data3':16, 'data4':10, 'data5':3},
 *          {'name':'metric three', 'data1':5, 'data2':2, 'data3':14, 'data4':12, 'data5':7},
 *          {'name':'metric four', 'data1':2, 'data2':14, 'data3':6, 'data4':1, 'data5':23},
 *          {'name':'metric five', 'data1':27, 'data2':38, 'data3':36, 'data4':13, 'data5':33}
 *      ]
 *  });
 *
 * new Ext.chart.AbstractChart({
 *      renderTo: Ext.getBody(),
 *      width: 500,
 *      height: 300,
 *      store: store,
 *      axes: [{
 *          type: 'Numeric',
 *          grid: true,
 *          position: 'left',
 *          fields: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *          title: 'Sample Values',
 *          grid: {
 *              odd: {
 *                  opacity: 1,
 *                  fill: '#ddd',
 *                  stroke: '#bbb',
 *                  'lineWidth': 1
 *              }
 *          },
 *          minimum: 0,
 *          adjustMinimumByMajorUnit: 0
 *      }, {
 *          type: 'Category',
 *          position: 'bottom',
 *          fields: ['name'],
 *          title: 'Sample Metrics',
 *          grid: true,
 *          label: {
 *              rotate: {
 *                  degrees: 315
 *              }
 *          }
 *      }],
 *      series: [{
 *          type: 'area',
 *          highlight: false,
 *          axis: 'left',
 *          xField: 'name',
 *          yField: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *          style: {
 *              opacity: 0.93
 *          }
 *      }]
 *  });
 * </code></pre>
 *
 *
 * <p>
 * In this configuration we set `area` as the type for the series, set highlighting options to true for highlighting elements on hover,
 * take the left axis to measure the data in the area series, set as xField (x values) the name field of each element in the store,
 * and as yFields (aggregated layers) seven data fields from the same store. Then we override some theming styles by adding some opacity
 * to the style object.
 * </p>
 *
 * @xtype area
 *
 */
Ext.define('Ext.chart.series.Area', {
    extend: 'Ext.chart.series.Cartesian',
    alias: 'series.area',
    type: 'area',
    seriesType: 'areaSeries',
    requires: ['Ext.chart.series.sprite.Area'],
    config: {
        xField: [],
        highlightCfg: {
            lineWidth: 3,
            stroke: '#55c',
            opacity: 0.8,
            color: '#f00'
        }
    },

    // @private Area charts are alyways stacked
    stacked: true
});
