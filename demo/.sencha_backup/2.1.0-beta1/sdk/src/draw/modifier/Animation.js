(function () {
    function reflect(n) {
        return n;
    }

    /**
     * Animation modifier.
     *
     * TODO: Finish documentation
     */
    Ext.define("Ext.draw.modifier.Animation", {
        mixins: {
            observable: 'Ext.mixin.Observable'
        },
        requires: [
            'Ext.draw.fx.Parser',
            'Ext.draw.fx.TimingFunctions'
        ],
        extend: 'Ext.draw.modifier.Modifier',
        alias: 'modifier.animation',

        config: {
            /**
             * @cfg {Function} easing
             * Default easing function.
             */
            easing: function (x) {
                return x;
            },

            /**
             * @cfg {Number} duration
             * Default duration time (ms).
             */
            duration: 0,
            specialEasings: {},
            specialDuration: {}
        },

        constructor: function () {
            this.callParent(arguments);
            this.animating = 0;
            this.animatingPool = [];
            this.anyAnimation = false;
            this.anySpecialAnimations = false;
        },

        createAttributes: function () {
            var proto = this.callParent(arguments),
                newAttr = Ext.Object.chain(proto);

            newAttr.animating = false;
            newAttr.timers = {};
            newAttr.animationOriginal = proto;
            return newAttr;
        },

        forkAttributes: function (attr) {
            var proto = this.callParent([attr.animationOriginal]),
                newAttr = Ext.Object.chain(proto),
                name;

            for (name in attr) {
                if (attr.hasOwnProperty(name)) {
                    newAttr[name] = attr[name];
                }
            }
            newAttr.animating = false;
            newAttr.timers = {};
            newAttr.animationOriginal = proto;
            return newAttr;
        },

        updateDuration: function (duration) {
            this.anyAnimation = duration > 0;
        },

        setAnimating: function (attributes, animating) {
            var me = this,
                i, j;

            if (attributes.animating != animating) {
                attributes.animating = animating;
                if (animating) {
                    me.animatingPool.push(attributes);
                    if (me.animating == 0) {
                        me.fireEvent('animationstart');
                        Ext.draw.fx.Queue.add(me);
                        Ext.draw.fx.Frame.ignite();
                    }
                    me.animating++;
                } else {
                    for (i = 0, j = 0; i < me.animatingPool.length; i++) {
                        if (me.animatingPool[i] != attributes) {
                            me.animatingPool[j++] = me.animatingPool[i];
                        }
                    }
                    me.animating = me.animatingPool.length = j;
                    if (me.animating == 0) {
                        me.fireEvent('animationend');
                    }
                }
            }
        },

        applyEasing: function (easing) {
            if (typeof easing === 'string') {
                return Ext.draw.fx.TimingFunctions.EasingMap[easing];
            } else {
                return easing;
            }
        },

        applySpecialEasings: function (newSpecialEasing, oldSpecialEasing) {
            oldSpecialEasing = oldSpecialEasing || {};
            var attr, attrs, easing, i, ln;

            for (attr in newSpecialEasing) {
                easing = newSpecialEasing[attr];
                attrs = attr.split(',');
                if (typeof easing === 'string') {
                    easing = Ext.draw.fx.TimingFunctions.EasingMap[easing];
                }
                for (i = 0, ln = attrs.length; i < ln; i++) {
                    oldSpecialEasing[attrs[i]] = easing;
                }
            }
            return oldSpecialEasing;
        },

        setEasingOn: function (attrs, easing) {
            attrs = Ext.Array.from(attrs).slice();
            var specialEasing = {},
                i = 0,
                ln = attrs.length;

            for (; i < ln; i++) {
                specialEasing[attrs[i]] = easing;
            }
            this.setSpecialEasings(specialEasing);
        },

        clearEasingOn: function (attrs) {
            attrs = Ext.Array.from(attrs, true);
            var i = 0, ln = attrs.length;
            for (; i < ln; i++) {
                delete this._specialEasing[attrs[i]];
            }
        },

        applySpecialDuration: function (newSpecialDuration, oldSpecialDuration) {
            oldSpecialDuration = oldSpecialDuration || {};
            var attr, duration, attrs, i, ln;

            for (attr in newSpecialDuration) {
                duration = newSpecialDuration[attr];
                attrs = attr.split(',');
                if (duration > 0) {
                    this.anySpecialAnimations = true;
                }
                for (i = 0, ln = attrs.length; i < ln; i++) {
                    oldSpecialDuration[attrs[i]] = duration;
                }
            }
            return oldSpecialDuration;
        },

        clearDurationOn: function (attrs) {
            attrs = Ext.Array.from(attrs, true);
            var i = 0, ln = attrs.length;

            for (; i < ln; i++) {
                delete this._specialDuration[attrs[i]];
            }
        },

        /**
         * Set the attr with given easing and duration.
         * @param {Object} attributes The attributes collection.
         * @param {Object} attrs The changes that poped up from lower modifier.
         * @return {Object} The changes to pop up.
         */
        setAttrs: function (attributes, attrs) {
            var changes = {},
                timers = attributes.timers,
                parsers = Ext.draw.fx.Parser.AttributeParser,
                defaultEasing = this._easing,
                defaultDuration = this._duration,
                specialDuration = this._specialDuration,
                specialEasings = this._specialEasings,
                anySpecial = this.anySpecialAnimations,
                any = this.anyAnimation || anySpecial,
                ignite = false,
                timer, name, newValue, originVal, parser, easing, duration;

            if (!any) {
                // If there is no animation enabled
                // When applying changes to attributes, simply stop current animation
                // and set the value.
                for (name in attrs) {
                    if (attributes[name] !== attrs[name]) {
                        changes[name] = attributes[name] = attrs[name];
                    }
                    delete timers[name];
                }
                return changes;
            } else {
                // If any animation
                for (name in attrs) {
                    newValue = attrs[name];
                    originVal = attributes[name];

                    if (newValue !== originVal && any && (name in attributes) && originVal !== undefined && originVal !== null && (parser = parsers[name])) {
                        // If this property is animating.

                        // Figure out the desired duration and easing.
                        easing = defaultEasing;
                        duration = defaultDuration;
                        if (anySpecial) {
                            // Deducing the easing function and duration
                            if (specialEasings[name]) {
                                easing = specialEasings[name];
                            }
                            if (specialDuration[name]) {
                                duration = specialDuration[name];
                            }
                        }

                        // If the property is animating
                        if (duration) {
                            if (!timers[name]) {
                                timers[name] = {};
                            }

                            timer = timers[name];
                            timer.start = 0;
                            timer.easing = easing;
                            timer.duration = duration;
                            timer.compute = parser.compute;
                            timer.serve = parser.serve || reflect

                            if (parser.parseInitial) {
                                var initial = parser.parseInitial(originVal, newValue);
                                timer.original = initial[0];
                                timer.attr = initial[1];
                            } else if (parser.parse) {
                                timer.original = parser.parse(originVal);
                                timer.attr = parser.parse(newValue);
                            } else {
                                timer.original = originVal;
                                timer.attr = newValue;
                            }

                            // The animation started. Change to originalVal.
                            timers[name] = timer;
                            changes[name] = timer.serve(timer.compute(timer.original, timer.attr, 0));
                            ignite = true;
                            continue;
                        }
                    }

                    // If the property is not animating.
                    delete timers[name];
                    attributes[name] = changes[name] = attrs[name];
                }
            }

            if (ignite && !attributes.animating) {
                this.setAnimating(attributes, true);
            }

            return changes;
        },

        /**
         * Update attributes to current value according to current animation time.
         * @param attributes
         * @return {Object} the changes to popup.
         */
        updateAttributes: function (attributes) {
            if (!attributes.animating) {
                return {};
            }
            var changes = {},
                any = false,
                timers = attributes.timers,
                now = Ext.draw.fx.Frame.animationTime(),
                name, timer, delta;

            if (attributes.lastUpdate == now) {
                return {};
            }
            for (name in timers) {
                timer = timers[name];
                if (!timer.start) {
                    timer.start = now;
                }
                delta = (now - timer.start) / timer.duration;
                if (delta >= 1) {
                    changes[name] = attributes[name] = timer.serve(timer.compute(timer.original, timer.attr, 1));
                    delete timers[name];
                } else {
                    changes[name] = attributes[name] = timer.serve(timer.compute(timer.original, timer.attr, timer.easing(delta)));
                }
                any = true;
            }
            attributes.lastUpdate = now;
            this.setAnimating(attributes, any);
            return changes;
        },

        pushDown: function (attributes, attr) {
            var popup = this.updateAttributes(attributes),
                name, result;
            // restore the current value.
            for (name in attr) {
                attributes[name] = attributes[name];
            }
            result = Ext.draw.modifier.Modifier.prototype.pushDown.call(this, attributes.animationOriginal, attr);
            result = Ext.apply(popup, this.setAttrs(attributes, result));
            return result;
        },

        popUp: function (attributes, attr) {
            var popup = this.updateAttributes(attributes);
            return Ext.draw.modifier.Modifier.prototype.popUp.call(this, attributes, Ext.apply(popup, this.setAttrs(attributes, attr)));
        },

        step: function () {
            var me = this,
                pool = me.animatingPool.slice(),
                i, ln;

            for (i = 0, ln = pool.length; i < ln; i++) {
                me.stepAttributes(pool[i]);
            }
        },

        stepAttributes: function (attributes) {
            var changes = this.updateAttributes(attributes),
                name;

            // Looking for anything in changes
            for (name in changes) {
                if (this._next) {
                    this._next.popUp(attributes, changes);
                }
                break;
            }
        }
    });
})();