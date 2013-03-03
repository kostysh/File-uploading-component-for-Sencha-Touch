/**
 * @private
 *
 * @xtype even
 */
Ext.define('Ext.chart.theme.EvenStyle', {

    extend: 'Ext.chart.theme.Style',

    constructor: function (config) {
        this.callParent(arguments);
    },

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    isXType: function (xtype) {
        return xtype === 'even';
    }
});


