/**
 * @class Ext.draw.fx.Abstract
 * @private
 * An abstract class used as the base for animations.
 *
 */
Ext.define('Ext.draw.fx.Abstract', {

    requires: ['Ext.draw.fx.TimingFunctions', 'Ext.draw.fx.Queue'],

    config: {
        /**
         * @cfg {Number} delay
         * The delay in ms for triggering the animation. Default's 0.
         */
        delay: 0,
        /**
         * @cfg {Number} duration
         * The duration of the animation in ms. Default's 1000.
         */
        duration: 1000,

        /**
         * @cfg {Number} easing
         *  An easing function for the animation. The easing function will receive a parameter in [0, 1] and
         *  return a float value.
         */
        easing: function (x) {
            return x;
        },

        /**
         * @cfg {Function} onCompute
         * Called on each step of the animation (if the animation is timer based).
         * The first argument of the function is a real number from [0, 1].
         */
        onCompute: Ext.emptyFn,

        /**
         * @cfg {Function} onComplete
         * Called once the animation has ended.
         */
        onComplete: Ext.emptyFn,

        /**
         * @cfg {Mixed} from
         *  The initial value for the animation.
         */
        from: 0,

        /**
         * @cfg {Mixed} to
         *  The end value for the animation.
         */
        to: 0
    },

    /**
     *
     * @constructor
     * @param {Object} config The configuration options
     */
    constructor: function (config) {
        this.initConfig(config);
    },

    /**
     * Starts the animation
     */
    start: function () {
        //Add to queue
        Ext.draw.fx.Queue.add(this);
    },

    /**
     * Stops the animation
     */
    stop: function () {
        //Remove from queue
        Ext.draw.fx.Queue.remove(this);
    },

    /**
     * Computes the current values for the animation
     */
    compute: Ext.emptyFn,

    step: Ext.emptyFn,

    /* Pauses the animation  */
    pause: Ext.emptyFn,

    resume: Ext.emptyFn,

    applyEasing: function (easing) {
        if (typeof easing === 'string') {
            return Ext.draw.fx.TimingFunctions.EasingMap[easing];
        } else {
            return easing;
        }
    }
});


