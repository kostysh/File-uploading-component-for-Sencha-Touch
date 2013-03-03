/**
 * @private
 *
 * @xtype odd
 */
Ext.define('Ext.chart.theme.OddStyle', {

    extend: 'Ext.chart.theme.Style',

    constructor: function (config) {
        this.callParent(arguments);
    },

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    isXType: function (xtype) {
        return xtype === 'odd';
    }
});

