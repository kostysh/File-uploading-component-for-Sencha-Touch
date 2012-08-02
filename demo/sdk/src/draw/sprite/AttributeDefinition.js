/**
 * Flyweight object to process the attribute of a sprite.
 */
Ext.define("Ext.draw.sprite.AttributeDefinition", {
    requires: [
        'Ext.draw.sprite.AttributeParser'
    ],

    config: {
        defaults: {

        },
        aliases: {

        },
        processors: {

        },
        dirtyTriggers: {

        },
        updaters: {

        }
    },

    inheritableStatics: {
        processorRe: /^(\w+)\(([\w\-,]+)\)$/
    },

    constructor: function (config) {
        var me = this;
        me.initConfig(config);
    },

    applyDefaults: function (defaults, oldDefaults) {
        oldDefaults = Ext.apply(oldDefaults || {}, this.normalize(defaults));
        return oldDefaults;
    },

    applyAliases: function (aliases, oldAliases) {
        return Ext.apply(oldAliases || {}, aliases);
    },

    applyProcessors: function (processors, oldProcessors) {
        var name,
            result = oldProcessors || {},
            defaultProcessor = Ext.draw.sprite.AttributeParser,
            processorRe = this.self.processorRe,
            match, fn;

        for (name in processors) {
            fn = processors[name];
            if (!Ext.isFunction(fn)) {
                if (Ext.isString(fn)) {
                    match = fn.match(processorRe);
                    if (match) {
                        fn = defaultProcessor[match[1]].apply(defaultProcessor, match[2].split(','));
                    } else {
                        fn = defaultProcessor[fn];
                    }
                } else {
                    continue;
                }
            }
            result[name] = fn;
        }
        return result;
    },

    applyDirtyTriggers: function (dirtyTriggers, oldDirtyTrigger) {
        if (!oldDirtyTrigger) {
            oldDirtyTrigger = {};
        }
        for (var name in dirtyTriggers) {
            oldDirtyTrigger[name] = dirtyTriggers[name].split(',');
        }
        return oldDirtyTrigger;
    },

    applyUpdaters: function (updaters, oldUpdaters) {
        return Ext.apply(oldUpdaters || {}, updaters);
    },

    normalize: function (changes) {
        if (!changes) {
            return {};
        }
        var definition = this,
            processors = definition.getProcessors(),
            aliases = definition.getAliases(),
            translation = changes.translation || changes.translate,
            normalized = {},
            name, val, rotation, scaling, matrix, split;

        if ('rotation' in changes) {
            rotation = changes.rotation;
        }
        else {
            rotation  = ('rotate' in changes) ? changes.rotate : undefined;
        }

        if ('scaling' in changes) {
            scaling = changes.scaling;
        }
        else {
            scaling = ('scale' in changes) ? changes.scale : undefined;
        }

        if (translation) {
            if ('x' in translation) {
                normalized.translationX = translation.x;
            }
            if ('y' in translation) {
                normalized.translationY = translation.y;
            }
        }

        if (typeof scaling !== 'undefined') {
            if (Ext.isNumber(scaling)) {
                normalized.scalingX = scaling;
                normalized.scalingY = scaling;
            } else {
                if ('x' in scaling) {
                    normalized.scalingX = scaling.x;
                }
                if ('y' in scaling) {
                    normalized.scalingY = scaling.y;
                }
                if ('centerX' in scaling) {
                    normalized.scalingCenterX = scaling.centerX;
                }
                if ('centerY' in scaling) {
                    normalized.scalingCenterY = scaling.centerY;
                }
            }
        }

        if (typeof rotation !== 'undefined') {
            if (Ext.isNumber(rotation)) {
                rotation = Ext.draw.Draw.rad(rotation);
                normalized.rotationRads = rotation;
            } else {
                if ('degrees' in rotation) {
                    var rads = Ext.draw.Draw.rad(rotation.degrees);
                    normalized.rotationRads = rads;
                }
                if ('centerX' in rotation) {
                    normalized.rotationCenterX = rotation.centerX;
                }
                if ('centerY' in rotation) {
                    normalized.rotationCenterY = rotation.centerY;
                }
            }
        }

        if ('matrix' in changes) {
            matrix = Ext.draw.Matrix.create(changes.matrix);
            split = matrix.split();

            normalized.matrix = matrix;
            normalized.rotationRads = split.rotation;
            normalized.rotationCenterX = 0;
            normalized.rotationCenterY = 0;
            normalized.scalingX = split.scaleX;
            normalized.scalingY = split.scaleY;
            normalized.scalingCenterX = 0;
            normalized.scalingCenterY = 0;
            normalized.translationX = split.translateX;
            normalized.translationY = split.translateY;
        }

        for (name in changes) {
            val = changes[name];
            if (typeof val === 'undefined') {
                continue;
            }
            if (name in aliases) {
                name = aliases[name];
            }
            if (name in processors) {
                val = processors[name].call(this, val);
                if (typeof val != 'undefined') {
                    normalized[name] = val;
                }
            }
        }
        return normalized;
    },

    setCanonical: function (attr, modifierStack, changes) {
        return modifierStack.pushDown(attr, changes);
    },

    set: function (attr, modifierStack, changes) {
        changes = this.normalize(changes);
        return this.setCanonical(attr, modifierStack, changes);
    }
});