/**
 * @class Ext.chart.interactions.DelayedSync
 *
 * This is a mixin for chart interactions which gives them basic support for synchronizing
 * the chart to the user's interaction after a configurable {@link #syncDelay delay}. This
 * is useful for example in interactions which perform fast CSS3 transformation during the
 * interaction's gesture, but needs to perform a full synchronization to that transformation
 * for full quality after a delay.
 *
 * @author Jason Johnston <jason@sencha.com>
 * @docauthor Jason Johnston <jason@sencha.com>
 */
(function () {
    Ext.define('Ext.chart.interactions.DelayedSync', {

        requires: ['Ext.chart.interactions.Abstract'],

        config: {
            /**
             * @cfg {Number} syncDelay
             * Specifies a timeout in milliseconds between when the user finishes an interaction
             * gesture and when the chart are synced and redrawn to match.
             */
            syncDelay: 30,

            /**
             * @cfg {String} syncWaitText
             * The text to be displayed while the chart is redrawing itself after the interaction sync.
             */
            syncWaitText: 'Rendering...'
        },

        constructor: function () {
            var me = this;
            me.startSyncTask = new DelayedTask(me.startSync, me);
            me.doSyncTask = new DelayedTask(me.doSync, me);
            me.unlockInteractionTask = new DelayedTask(me.unlockInteraction, me);
        },

        sync: Ext.emptyFn,

        needsSync: function () {
            return true;
        },

        startSync: function () {
            var me = this;
            if (me.needsSync()) {
                me.lockInteraction();
                // Must delay the actual rerender to allow the lock/mask to take effect
                me.doSyncTask.delay(1);
            }
        },

        doSync: function () {
            var me = this;

            // Invoke the class's sync logic
            if (me.needsSync()) {
                me.sync();
            }

            // Must delay the unlock otherwise the browser will queue the events during
            // render and apply them immediately afterward
            me.unlockInteractionTask.delay(1);
        },

        cancelSync: function () {
            var me = this;
            me.startSyncTask.cancel();
            me.doSyncTask.cancel();
            me.unlockInteractionTask.cancel();
        },

        delaySync: function () {
            var me = this;
            me.cancelSync();
            me.startSyncTask.delay(me.getSyncDelay());
        },

        lockInteraction: function () {
            var me = this,
                chart = me.getChart(),
                chartEl = chart.element,
                stopEvent = me.stopEvent;

            me.unlockInteraction();
            chartEl.on({
                touchstart: stopEvent,
                touchmove: stopEvent,
                touchend: stopEvent,
                capture: true
            });

            // chartEl.mask(me.getSyncWaitText(), Ext.baseCSSPrefix + 'chart-wait', false);
            // Ext.repaint(); //mask doesn't get sized properly otherwise
        },

        unlockInteraction: function () {
            var me = this,
                chart = me.getChart(),
                chartEl = chart.element,
                stopEvent = me.stopEvent;

            chartEl.un({
                touchstart: stopEvent,
                touchmove: stopEvent,
                touchend: stopEvent,
                capture: true
            });

            // chartEl.unmask();
        },

        stopEvent: function (e) {
            e.stopEvent();
        }
    });
    function DelayedTask(task, scope) {
        this.task = task;
        this.scope = scope || this;
        this.timer = null;
    }

    DelayedTask.prototype = {
        delay: function (time) {
            var me = this;
            me.cancel();
            me.timer = setTimeout(function () {
                me.task.call(me.scope);
            }, time);
        },
        cancel: function () {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }
    };
})();
