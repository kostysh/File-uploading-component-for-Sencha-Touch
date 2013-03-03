/**
 * @class Ext.draw.fx.Frame
 * @extends Ext.draw.fx.Abstract
 *
 * Frame by frame based animation. Will use requestAnimationFrame or timer based animations.
 *
 * Example Code:
 *
 *   var fx = Ext.create('Ext.draw.fx.Frame', {
 *       duration: 1000,
 *
 *       onCompute: function(from, to, delta) {
 *           console.log(Ext.draw.fx.Frame.compute(from, to, delta));
 *       },
 *
 *       onComplete: function() {
 *         console.log('animation ended!');
 *       }
 *   });
 *
 *   fx.setFrom(0);
 *   fx.setTo(10);
 *
 *   fx.start();
 *
 */
Ext.define('Ext.draw.fx.Frame', {
    uses: ['Ext.draw.Draw'],
    requires: ['Ext.draw.fx.Queue'],
    singleton: true,

    //Handle frame by frame callbacks.
    //I don't see a better way of doing this since I can't
    //integrate Observable as static methods for a non-singleton class.

    _frameCallbacks: {},
    _frameCallbackId: 0,
    scheduled: 0,
    frameStartTimeOffset: Ext.frameStartTime,

    schedule: function (callback, scope) {
        scope = scope || this;
        var id = 'frameCallback' + (this._frameCallbackId++);

        if (Ext.isString(callback)) {
            callback = scope[callback];
        }
        Ext.draw.fx.Frame._frameCallbacks[id] = {fn: callback, scope: scope, once: true};
        this.scheduled++;
        Ext.draw.fx.Frame.ignite();
        return id;
    },

    cancel: function (id) {
        if (Ext.draw.fx.Frame._frameCallbacks[id] && Ext.draw.fx.Frame._frameCallbacks[id].once) {
            this.scheduled--;
            delete Ext.draw.fx.Frame._frameCallbacks[id];
        }
    },

    addFrameCallback: function (callback, scope) {
        scope = scope || this;
        if (Ext.isString(callback)) {
            callback = scope[callback];
        }
        var id = 'frameCallback' + (this._frameCallbackId++);

        Ext.draw.fx.Frame._frameCallbacks[id] = {fn: callback, scope: scope};
        return id;
    },

    removeFrameCallback: function (id) {
        delete Ext.draw.fx.Frame._frameCallbacks[id];
    },

    fireFrameCallbacks: function () {
        var callbacks = this._frameCallbacks,
            once = [],
            id, i, ln, fn, cb;

        for (id in callbacks) {
            cb = callbacks[id];
            fn = cb.fn;
            if (Ext.isString(fn)) {
                fn = cb.scope[fn];
            }
            fn.call(cb.scope);
            if (cb.once) {
                once.push(id);
            }
        }
        for (i = 0, ln = once.length; i < ln; i++) {
            this.scheduled--;
            delete callbacks[once[i]];
        }
    },

    /* A basic linear interpolation function. */
    compute: function (from, to, delta) {
        return from + (to - from) * delta;
    },

    /**
     *  Cross browser animationTime implementation
     */
    animationTime: function () {
        return Ext.frameStartTime - this.frameStartTimeOffset;
    },

    /* Cross browser requestAnimationFrame implementation */
    requestAnimationFrame: (function () {
        var global = (self || window || this),
            prefix = ['webkit', 'moz', 'o', 'ms'],
            i = 0,
            l = prefix.length,
            method;

        //check for requestAnimationFrame
        if (global.requestAnimationFrame) {
            return function (callback) {
                global.requestAnimationFrame(function () {
                    callback();
                });
            };
        }

        //check for vendor prefixes
        for (; i < l; ++i) {
            method = prefix[i] + 'RequestAnimationFrame';
            if (global[method]) {
                method = global[method];
                return function (callback) {
                    method(callback);
                };
            }
        }

        //fallback to setTimeout
        return function (callback) {
            setTimeout(function () {
                callback();
            }, 1);
        };

    })()
}, function () {
    //Initialize the endless animation loop.
    var looping = false,
        ExtQueue = Ext.draw.fx.Queue,
        Frame = Ext.draw.fx.Frame,
        animationStartTimePolyfill = (function () {
            var global = (self || window || this),
                prefix = ['webkit', 'moz', 'o', 'ms'],
                i = 0,
                l = prefix.length,
                property;

            //check for animationTime
            if (global.animationStartTime) {
                return function () {
                    return global.animationStartTime;
                };
            }

            //check for vendor prefixes
            for (; i < l; ++i) {
                property = prefix[i] + 'AnimationStartTime';
                if (global[property]) {
                    return function () {
                        return global[property];
                    };
                }
            }

            if (Date.now) {
                return Date.now;
            }
            return function () {
                return +new Date();
            }
        })();
    // <debug>
    var startLooping, frames;
    // </debug>
    function loop() {
        Ext.frameStartTime = animationStartTimePolyfill();

        // <debug>
        if (startLooping === undefined) {
            startLooping = Ext.frameStartTime;
        }
        // </debug>
        ExtQueue.refresh(Ext.frameStartTime);
        Frame.fireFrameCallbacks();
        if (Frame.scheduled || !ExtQueue.empty()) {
            Frame.requestAnimationFrame(loop);
            // <debug>
            frames++;
            // </debug>
        } else {
            looping = false;
            // <debug>
            startLooping = undefined;
            // </debug>
        }
        // <debug>
        Frame.framerate = frames * 1000 / (Frame.animationTime() - startLooping);
        // </debug>

    }

    // <debug>
    Frame.clearCounter = function () {
        startLooping = Frame.animationTime();
        frames = 0;
    };
    // </debug>

    Frame.ignite = function () {
        if (!looping) {
            // <debug>
            frames = 0;
            // </debug>
            looping = true;
            Frame.requestAnimationFrame(loop);
            Ext.draw.Draw.updateIOS();
        }
    }

});
