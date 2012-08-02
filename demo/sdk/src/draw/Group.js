/**
 * Draw group.
 */
Ext.define("Ext.draw.Group", {
    mixins: {
        identifiable: 'Ext.mixin.Identifiable',
        observable: 'Ext.mixin.Observable'
    },

    config: {
        surface: null
    },

    statics: {
        createRelayEvent: function (name) {
            return (function (e) {
                this.fireEvent(name, e);
            });
        },

        createDispatcherMethod: function (name) {
            return function () {
                var args = Array.prototype.slice.call(arguments, 0), items = this.items, i = 0, ln = items.length, item;
                while (i < ln) {
                    item = items[i++];
                    item[name].apply(item, args);
                }
            };
        }
    },

    autoDestroy: false,

    constructor: function (config) {
        this.initConfig(config);
        this.map = {};
        this.items = [];
        this.length = 0;
    },

    add: function (sprite) {
        var id = sprite.getId(),
            oldSprite = this.map[id];
        if (!oldSprite) {
            sprite.group.push(this.id);
            this.map[id] = sprite;
            this.items.push(sprite);
            this.length++;
        } else if (sprite !== oldSprite) {
            Ext.Logger.error('Sprite with duplicated id.');
        }
    },

    remove: function (sprite, destroySprite) {
        var id = sprite.getId(),
            oldSprite = this.map[id];

        destroySprite = destroySprite || this.autoDestroy;
        if (oldSprite) {
            if (oldSprite === sprite) {
                delete this.map[id];
                this.length--;
                Ext.Array.remove(this.items, sprite);
                if (destroySprite) {
                    oldSprite.destroy();
                } else {
                    Ext.Array.remove(sprite.group, this);
                }
            } else if (sprite !== oldSprite) {
                Ext.Logger.error('Sprite with duplicated id.');
            }
        }
    },

    addAll: function (sprites) {
        if (sprites.isSprite) {
            this.add(sprites);
        } else if (Ext.isArray(sprites)) {
            var i = 0;
            while (i < sprites.length) {
                this.add(sprites[i++]);
            }
        }
    },

    each: function (fn) {
        var i = 0,
            items = this.items,
            ln = items.length;
        while (i < ln) {
            if (false === fn(items[i])) {
                return;
            }
        }
    },

    clear: function (destroySprite) {
        var i, ln, sprite, items;

        if (destroySprite || this.autoDestroy) {
            items = this.items.slice(0);
            for (i = 0, ln = items.length; i < ln; i++) {
                items[i].destroy();
            }
        } else {
            items = this.items.slice(0);
            for (i = 0, ln = items.length; i < ln; i++) {
                Ext.Array.remove(sprite.group, this);
            }
        }
        this.length = 0;
        this.map = {};
        this.items.length = 0;
    },

    getAt: function (i) {
        return this.items[i];
    },

    get: function (id) {
        return this.map[id] || this.items[id];
    },

    destroy: function () {
        this.clear();
        this.getSurface().getGroups().remove(this);
    }
}, function () {

    this.addMembers({
        /**
         * Set attributes to all sprites.
         *
         * @param {Object} o Sprite attribute options just like in {@link Ext.draw.sprite.Sprite}.
         * @method
         */
        setAttributes: this.createDispatcherMethod('setAttributes'),

        /**
         * Display all sprites in the Group.
         *
         * @param {Boolean} o Whether to re-render the frame.
         * @method
         */
        show: this.createDispatcherMethod('show'),

        /**
         * Hide all sprites in the Group.
         *
         * @param {Boolean} o Whether to re-render the frame.
         * @method
         */
        hide: this.createDispatcherMethod('hide'),

        /**
         * Trigger an animation for all sprites in the Group.
         * @method
         */
        setDirty: this.createDispatcherMethod('setDirty'),

        /**
         * Return the minimal bounding box that contains all the sprites bounding boxes in this group.
         */
        getBBox: function () {
            if (this.length == 0) {
                return {x: 0, y: 0, width: 0, height: 0};
            }
            var i, ln, l, r, t, b, bbox;
            bbox = this.items[0].getBBox();
            l = bbox.x;
            r = l + bbox.width;
            t = bbox.y;
            b = t + bbox.height;
            for (i = 1, ln = this.items.length; i < ln; i++) {
                bbox = this.items[i].getBBox();
                if (bbox.x + bbox.width > r) {
                    r = bbox.x + bbox.width;
                }
                if (bbox.x < l) {
                    l = bbox.x;
                }
                if (bbox.y + bbox.height > b) {
                    b = bbox.y + bbox.height;
                }
                if (bbox.y < t) {
                    t = bbox.y;
                }
            }
            return {
                x: l,
                y: t,
                height: b - t,
                width: r - l
            };
        }
    });
});