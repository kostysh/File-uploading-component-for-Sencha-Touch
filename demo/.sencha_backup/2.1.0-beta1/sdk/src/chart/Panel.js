/**
 * @ignore
 */
Ext.define('Ext.chart.Panel', {

    extend: 'Ext.Container',

    xtype: 'chartpanel',

    requires: ['Ext.chart.AbstractChart', 'Ext.TitleBar'],

    config: {
        chart: null,

        buttons: [],

        defaultType: 'chart',

        layout: 'fit',

        title: ''
    },

    constructor: function (config) {
        var ui = config.ui || 'dark',
            toolbar = {
                xtype: 'panel',
                height: '2.6em',
                docked: 'top',
                layout: {
                    type: 'card',
                    align: 'stretch'
                },
                activeItem: 0,
                ui: ui,
                items: [
                    {
                        xtype: 'titlebar',
                        ui: ui,
                        title: '',
                        defaults: {
                            align: 'right'
                        },
                        items: {
                            xtype: 'spacer'
                        }
                    },
                    {
                        xtype: 'toolbar',
                        ui: ui,
                        title: ''
                    }
                ]
            };
        config.items = [toolbar];
        this.callParent([config]);
    },

    initialize: function (config) {
        var me = this,
            headerPanel;
        me.callParent(arguments);

        headerPanel = me.headerPanel = me.getItems().get(0);
        me.descriptionPanel = headerPanel.getItems().get(1);

    },

    updateTitle: function (title) {
        this.getItems().get(0).getItems().get(0).setTitle(title);
    },

    applyButtons: function (buttons) {
        return this.getItems().get(0).getItems().get(0).add(buttons);
    },

    applyChart: function (chart, currentChart) {
        if (chart !== currentChart) {
            chart = Ext.factory(chart, 'Ext.chart.AbstractChart', currentChart);
        }
        if (!currentChart) {
            this.add(chart);
        }
        return chart;
    }
});
