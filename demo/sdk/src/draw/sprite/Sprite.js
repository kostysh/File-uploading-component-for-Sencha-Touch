/**
 * A Sprite is an object rendered in a Drawing surface. There are different options and types of sprites.
 * The configuration of a Sprite is an object with the following properties:
 *
 * - **type** - (String) The type of the sprite. Possible options are 'circle', 'path', 'rect', 'text', 'square', 'image'.
 * - **group** - (String/Array) The group that this sprite belongs to, or an array of groups. Only relevant when added to a {@link Ext.draw.Surface}.
 * - **width** - (Number) Used in rectangle sprites, the width of the rectangle.
 * - **height** - (Number) Used in rectangle sprites, the height of the rectangle.
 * - **size** - (Number) Used in square sprites, the dimension of the square.
 * - **radius** - (Number) Used in circle sprites, the radius of the circle.
 * - **x** - (Number) The position along the x-axis.
 * - **y** - (Number) The position along the y-axis.
 * - **path** - (Array) Used in path sprites, the path of the sprite written in SVG-like path syntax.
 * - **opacity** - (Number) The opacity of the sprite.
 * - **fill** - (String) The fill color.
 * - **stroke** - (String) The stroke color.
 * - **stroke-width** - (Number) The width of the stroke.
 * - **font** - (String) Used with text type sprites. The full font description. Uses the same syntax as the CSS `font` parameter.
 * - **text** - (String) Used with text type sprites. The text itself.
 *
 * Additionally there are three transform objects that can be set with `setAttributes` which are `translate`, `rotate` and
 * `scale`.
 *
 * For translate, the configuration object contains x and y attributes that indicate where to
 * translate the object. For example:
 *
 *     sprite.setAttributes({
 *       translate: {
 *        x: 10,
 *        y: 10
 *       }
 *     }, true);
 *
 * For rotation, the configuration object contains x and y attributes for the center of the rotation (which are optional),
 * and a `degrees` attribute that specifies the rotation in degrees. For example:
 *
 *     sprite.setAttributes({
 *       rotate: {
 *        degrees: 90
 *       }
 *     }, true);
 *
 * For scaling, the configuration object contains x and y attributes for the x-axis and y-axis scaling. For example:
 *
 *     sprite.setAttributes({
 *       scale: {
 *        x: 10,
 *        y: 3
 *       }
 *     }, true);
 *
 * Sprites can be created with a reference to a {@link Ext.draw.Surface}
 *
 *      var drawComponent = Ext.create('Ext.draw.Component', options here...);
 *
 *      var sprite = Ext.create('Ext.draw.sprite.Sprite', {
 *          type: 'circle',
 *          fill: '#ff0',
 *          surface: drawComponent.surface,
 *          radius: 5
 *      });
 *
 * Sprites can also be added to the surface as a configuration object:
 *
 *      var sprite = drawComponent.surface.add({
 *          type: 'circle',
 *          fill: '#ff0',
 *          radius: 5
 *      });
 *
 * In order to properly apply properties and render the sprite we have to
 * `show` the sprite setting the option `redraw` to `true`:
 *
 *      sprite.show(true);
 *
 * The constructor configuration object of the Sprite can also be used and passed into the {@link Ext.draw.Surface}
 * add method to append a new sprite to the canvas. For example:
 *
 *     drawComponent.surface.add({
 *         type: 'circle',
 *         fill: '#ffc',
 *         radius: 100,
 *         x: 100,
 *         y: 100
 *     });
 */
Ext.define('Ext.draw.sprite.Sprite', {

    mixins: {
        observable: 'Ext.mixin.Observable'
    },

    requires: [
        'Ext.draw.Draw',
        'Ext.draw.gradient.Gradient',
        'Ext.draw.sprite.AttributeDefinition',
        'Ext.draw.sprite.AttributeParser',
        'Ext.draw.modifier.Target',
        'Ext.draw.modifier.Animation'
    ],

    isSprite: true,

    inheritableStatics: {
        def: {
            processors: {
                strokeStyle: "color",
                fillStyle: "color",
                strokeOpacity: "limited01",
                fillOpacity: "limited01",

                lineWidth: "number",
                lineCap: "enums(butt,round,square)",
                lineJoin: "enums(round,bevel,miter)",
                miterLimit: "number",

                shadowColor: "color",
                shadowOffsetX: "number",
                shadowOffsetY: "number",
                shadowBlur: "number",

                globalAlpha: "limited01",
                globalCompositeOperation: "enums(source-over,destination-over,source-in,destination-in,source-out,destination-out,source-atop,destination-atop,lighter,xor,copy)",
                hidden: "bool",
                transformFillStroke: "bool",
                zIndex: "number",

                translationX: "number",
                translationY: "number",
                rotationRads: "number",
                rotationCenterX: "number",
                rotationCenterY: "number",
                scalingX: "number",
                scalingY: "number",
                scalingCenterX: "number",
                scalingCenterY: "number"
            },

            aliases: {
                "stroke": "strokeStyle",
                "fill": "fillStyle",
                "color": "fillStyle",
                "stroke-width": "lineWidth",
                "stroke-linecap": "lineCap",
                "stroke-linejoin": "lineJoin",
                "stroke-miterlimit": "miterLimit",
                "text-anchor": "textAlign",
                "opacity": "globalAlpha",

                translateX: "translationX",
                translateY: "translationY",
                rotateRads: "rotationRads",
                rotateCenterX: "rotationCenterX",
                rotateCenterY: "rotationCenterY",
                scaleX: "scalingX",
                scaleY: "scalingY",
                scaleCenterX: "scalingCenterX",
                scaleCenterY: "scalingCenterY"
            },

            defaults: {
                hidden: false,
                zIndex: 0,

                strokeOpacity: 1,
                fillOpacity: 1,
                transformFillStroke: false,

                translationX: 0,
                translationY: 0,
                rotationRads: 0,
                rotationCenterX: null,
                rotationCenterY: null,
                scalingX: 1,
                scalingY: 1,
                scalingCenterX: null,
                scalingCenterY: null
            },

            dirtyTriggers: {
                hidden: "canvas",
                zIndex: "zIndex",

                globalAlpha: "canvas",
                globalCompositeOperation: "canvas",

                transformFillStroke: "canvas",
                strokeStyle: "canvas",
                fillStyle: "canvas",
                strokeOpacity: "canvas",
                fillOpacity: "canvas",

                lineWidth: "canvas",
                lineCap: "canvas",
                lineJoin: "canvas",
                miterLimit: "canvas",

                shadowColor: "canvas",
                shadowOffsetX: "canvas",
                shadowOffsetY: "canvas",
                shadowBlur: "canvas",

                translationX: "transform",
                translationY: "transform",
                rotationRads: "transform",
                rotationCenterX: "transform",
                rotationCenterY: "transform",
                scalingX: "transform",
                scalingY: "transform",
                scalingCenterX: "transform",
                scalingCenterY: "transform"
            },

            updaters: {
                "bbox": function (attrs) {
                    attrs.bbox.plain = false;
                    attrs.bbox.transform = false;
                    if (
                        attrs.rotationRads != 0 && (attrs.rotationCenterX === null || attrs.rotationCenterY === null) ||
                            ((attrs.scalingX != 1 || attrs.scalingY != 1) &&
                                (attrs.scalingCenterX === null || attrs.scalingCenterY === null)
                                )
                        ) {
                        if (!attrs.dirtyFlags.transform) {
                            attrs.dirtyFlags.transform = [];
                        }
                    }
                },

                "zIndex": function (attrs) {
                    attrs.dirtyZIndex = true;
                },

                "transform": function (attrs) {
                    attrs.dirtyTransform = true;
                    attrs.bbox.transform = false;
                }
            }
        }
    },

    config: {
        dirty: true,
        parent: null
    },

    /**
     * @cfg {String} type The type of the sprite. Possible options are 'circle', 'path', 'rect', 'text', 'square', 'image'
     */

    /**
     * @cfg {Number} width Used in rectangle sprites, the width of the rectangle
     */

    /**
     * @cfg {Number} height Used in rectangle sprites, the height of the rectangle
     */

    /**
     * @cfg {Number} size Used in square sprites, the dimension of the square
     */

    /**
     * @cfg {Number} radius Used in circle sprites, the radius of the circle
     */

    /**
     * @cfg {Number} x The position along the x-axis
     */

    /**
     * @cfg {Number} y The position along the y-axis
     */

    /**
     * @cfg {Array} path Used in path sprites, the path of the sprite written in SVG-like path syntax
     */

    /**
     * @cfg {Number} opacity The opacity of the sprite
     */

    /**
     * @cfg {String} fill The fill color
     */

    /**
     * @cfg {String} stroke The stroke color
     */

    /**
     * @cfg {Number} stroke-width The width of the stroke
     */

    /**
     * @cfg {String} font Used with text type sprites. The full font description. Uses the same syntax as the CSS font parameter
     */

    /**
     * @cfg {String} text Used with text type sprites. The text itself
     */

    /**
     * @cfg {String/Array} group The group that this sprite belongs to, or an array of groups. Only relevant when added to a
     * {@link Ext.draw.Surface}
     */

    /**
     * @event beforedestroy
     */
    /**
     * @event destroy
     */
    /**
     * @event render
     */
    /**
     * @event mousedown
     */
    /**
     * @event mouseup
     */
    /**
     * @event mouseover
     */
    /**
     * @event mouseout
     */
    /**
     * @event mousemove
     */
    /**
     * @event click
     */
    /**
     * @event rightclick
     */
    /**
     * @event mouseenter
     */
    /**
     * @event mouseleave
     */
    /**
     * @event touchstart
     */
    /**
     * @event touchmove
     */
    /**
     * @event touchend
     */

    onClassExtended: function (Class, member) {
        var initCfg = Class.superclass.self.def.initialConfig,
            cfg;

        if (member.inheritableStatics && member.inheritableStatics.def) {
            cfg = Ext.merge({}, initCfg, member.inheritableStatics.def);
            Class.def = Ext.create("Ext.draw.sprite.AttributeDefinition", cfg);
            delete member.inheritableStatics.def;
        } else {
            Class.def = Ext.create("Ext.draw.sprite.AttributeDefinition", initCfg);
        }
    },

    constructor: function (config) {
        if (this.$className == 'Ext.draw.sprite.Sprite') {
            throw 'Ext.draw.sprite.Sprite is an abstract class';
        }
        config = config || {};
        var me = this,
            groups = [].concat(config.group || []),
            i, ln;

        config = config || {};
        me.id = config.id || Ext.id(null, 'ext-sprite-');
        me.group = new Array(groups.length);

        for (i = 0, ln = groups.length; i < ln; i++) {
            me.group[i] = groups[i].id || groups[i].toString();
        }

        me.prepareModifiers();
        me.setAttributes(config);
        me.initConfig(config);
    },

    setDirty: function (dirty) {
        if (this._dirty = dirty) {
            if (this._parent) {
                this._parent.setDirty(true);
            }
        }
    },

    prepareModifiers: function () {
        var me = this;
        me.preFxModifiers = [];

        me.fx = new Ext.draw.modifier.Animation();
        me.topModifier = new Ext.draw.modifier.Target({sprite: me});

        // Link modifiers
        me.fx.setNext(me.topModifier);

        // Set defaults
        me.attr = me.topModifier.createAttributes();
        me.setAttributesCanonical(me.self.def.getDefaults());
    },

    pushPreFxModifier: function (modifier) {
        modifier.beforeAttach(this);
        this.preFxModifiers.push(modifier);
        modifier.setNext(this.fx);
    },

    updateDirtyFlags: function (attrs) {
        var me = this,
            dirtyFlags = attrs.dirtyFlags, flags,
            updaters = me.self.def._updaters,
            any = false,
            dirty = false,
            flag;

        me.updateDirtyFlags = Ext.emptyFn;
        do {
            any = false;
            for (flag in dirtyFlags) {
                flags = dirtyFlags[flag];
                delete dirtyFlags[flag];
                dirty = true;
                if (updaters[flag]) {
                    updaters[flag].call(me, attrs, flags);
                }
                any = true;
            }
        } while (any);

        if (dirty) {
            me.setDirty(true);
        }
        delete me.updateDirtyFlags;
    },

    bindAttributes: function (attrs) {
        var me = this;

        me.attr = attrs;
        me.updateDirtyFlags(attrs);
        me.setDirty(true);
    },

    getAttributes: function () {
        return this.attr;
    },

    setAttributes: function (attrs) {
        this.setAttributesCanonical(this.self.def.normalize(attrs));
    },

    setAttributesCanonical: function (attrs) {
        var attributes = this.attr;
        this.topModifier.pushDown(attributes, attrs);
        this.updateDirtyFlags(attributes);
    },

    /**
     * Returns the bounding box for the given Sprite as calculated with the Canvas engine.
     *
     * @param {Boolean} isWithoutTransform Whether to calculate the bounding box with the current transforms or not.
     */
    getBBox: function (isWithoutTransform) {

    },

    /**
     * Subclass can rewrite this function to gain better performance
     * @param isWithoutTransform
     */
    getBBoxCenter: function (isWithoutTransform) {
        var bbox = this.getBBox(isWithoutTransform);
        return [
            bbox.x + bbox.width * 0.5,
            bbox.y + bbox.height * 0.5
        ];
    },

    /**
     * Hide the sprite.
     * @return {Ext.draw.sprite.Sprite} this
     */
    hide: function () {
        this.attr.hidden = true;
        this.setDirty(true);
        return this;
    },

    /**
     * Show the sprite.
     * @return {Ext.draw.sprite.Sprite} this
     */
    show: function () {
        this.attr.hidden = false;
        this.setDirty(true);
        return this;
    },

    useAttributes: function (ctx) {
        var attrs = this.attr,
            canvasAttributes = attrs.canvasAttributes,
            strokeStyle = canvasAttributes.strokeStyle,
            fillStyle = canvasAttributes.fillStyle,
            bbox, id;

        if (strokeStyle && strokeStyle.isGradient) {
            bbox = this.getBBox(attrs.transformFillStroke);
            ctx.strokeStyle = strokeStyle.getGradient(ctx, bbox);
        }

        if (fillStyle && fillStyle.isGradient) {
            bbox = bbox || this.getBBox(attrs.transformFillStroke)
            ctx.fillStyle = fillStyle.getGradient(ctx, bbox);
        }

        for (id in canvasAttributes) {
            if (canvasAttributes[id] !== undefined) {
                ctx[id] = canvasAttributes[id];
            }
        }
    },

    // @private
    applyTransformations: function (force) {
        if (!force && !this.attr.dirtyTransform) {
            return;
        }
        var me = this,
            attr = me.attr,
            center = me.getBBoxCenter(true),
            centerX = center[0],
            centerY = center[1],

            x = attr.translationX,
            y = attr.translationY,

            sx = attr.scalingX,
            sy = attr.scalingY === null ? attr.scalingX : attr.scalingY,
            scx = attr.scalingCenterX === null ? centerX : attr.scalingCenterX,
            scy = attr.scalingCenterY === null ? centerY : attr.scalingCenterY,

            rad = attr.rotationRads,
            rcx = attr.rotationCenterX === null ? centerX : attr.rotationCenterX,
            rcy = attr.rotationCenterY === null ? centerY : attr.rotationCenterY,

            cos = Math.cos(rad),
            sin = Math.sin(rad);

        if (sx === 1 && sy === 1) {
            scx = 0;
            scy = 0;
        }

        if (rad === 0) {
            rcx = 0;
            rcy = 0;
        }

        attr.matrix.elements = [
            cos * sx, sin * sy,
            -sin * sx, cos * sy,
            scx + (rcx - cos * rcx - scx + rcy * sin) * sx + x,
            scy + (rcy - cos * rcy - scy + rcx * -sin) * sy + y
        ];
        attr.matrix.inverse(attr.inverseMatrix);
        attr.dirtyTransform = false;
        attr.bbox.transform = 0;
    },

    /**
     * Removes the sprite and clears all listeners.
     */
    destroy: function () {
        var me = this, modifier = me.topModifier, curr;
        while (modifier) {
            curr = modifier;
            modifier = modifier.getPrevious();
            curr.destroy();
        }

        me.destroy = Ext.emptyFn;
        if (me.fireEvent('beforedestroy', me) !== false) {
            me.fireEvent('destroy', me);
        }
        this.callParent();
    }
}, function () {
    this.def = Ext.create("Ext.draw.sprite.AttributeDefinition", this.def);
});

