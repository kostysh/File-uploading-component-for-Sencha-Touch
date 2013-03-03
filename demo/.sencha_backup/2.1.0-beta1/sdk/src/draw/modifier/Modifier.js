/**
 * @class Ext.draw.modifier.Modifier
 * Each sprite has a stack of modifier. The resulting attributes of sprite is
 * the content of the stack top. When setting attributes to a sprite,
 * changes will be pushed-down though the stack of modifiers and pop-back the
 * additive changes; When modifier is triggered to change the attribute of a
 * sprite, it will pop-up the changes to the top.
 */
Ext.define("Ext.draw.modifier.Modifier", {
    config: {
        /**
         * @cfg {Ext.draw.modifier.Modifier} previous Previous modifier that receives
         * the push-down changes.
         */
        previous: null,

        /**
         * @cfg {Ext.draw.modifier.Modifier} next Next modifier that receives the
         * pop-up changes.
         */
        next: null
    },

    constructor: function (config) {
        this.initConfig(config);
    },

    updateNext: function (next) {
        if (next) {
            next.setPrevious(this);
        }
    },

    createAttributes: function () {
        if (this._previous) {
            return this._previous.createAttributes();
        } else {
            return {};
        }
    },

    forkAttributes: function (attr) {
        if (this._previous) {
            return this._previous.forkAttributes(attr);
        } else {
            return Ext.apply({}, attr);
        }
    },

    popUp: function (attributes, config) {
        if (this._next) {
            this._next.popUp(attributes, config);
        }
    },

    pushDown: function (attributes, changes) {
        if (this._previous) {
            return this._previous.pushDown(attributes, changes);
        } else {
            var result = {},
                name;
            for (name in changes) {
                if (changes[name] !== attributes[name]) {
                    result[name] = attributes[name] = changes[name];
                }
            }
            return result;
        }
    },

    beforeAttach: function (sprite) {

    }
});