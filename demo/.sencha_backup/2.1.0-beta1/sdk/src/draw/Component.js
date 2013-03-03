/**
 * @class Ext.draw.Component
 * @extends Ext.Component
 *
 * The Draw Component is a surface in which sprites can be rendered. The Draw Component
 * manages and holds a `Surface` instance: an interface that has
 * an SVG or VML implementation depending on the browser capabilities and where
 * Sprites can be appended.
 * One way to create a draw component is:
 *
 *     var drawComponent = new Ext.draw.Component({
 *         items: [{
 *             type: 'circle',
 *             fill: '#79BB3F',
 *             radius: 100,
 *             x: 100,
 *             y: 100
 *         }]
 *     });
 *
 *     new Ext.Panel({
 *         fullscreen: true,
 *         items: [drawComponent]
 *     });
 *
 * In this case we created a draw component and added a sprite to it.
 * The *type* of the sprite is *circle* so if you run this code you'll see a yellow-ish
 * circle in a Window. When setting `viewBox` to `false` we are responsible for setting the object's position and
 * dimensions accordingly.
 *
 * You can also add sprites by using the surface's add method:
 *
 *     drawComponent.getSurface('main').add({
 *         type: 'circle',
 *         fill: '#79BB3F',
 *         radius: 100,
 *         x: 100,
 *         y: 100
 *     });
 *
 * For more information on Sprites, the core elements added to a draw component's surface,
 * refer to the {@link Ext.draw.sprite.Sprite} documentation.
 */
Ext.define('Ext.draw.Component', {

    extend: 'Ext.Container',
    xtype: 'draw',
    defaultType: 'surface',

    requires: [
        'Ext.draw.Surface',
        'Ext.draw.engine.Svg',
        'Ext.draw.engine.Canvas'
    ],
    engine: 'Ext.draw.engine.Canvas',
    statics: {
        WATERMARK: 'Powered by <span style="color:#22E962; font-weight: 900">Sencha Touch</span> <span style="color:#75cdff; font-weight: 900">GPL</span>'
    },
    config: {
        cls: 'x-draw-component',

        /**
         * @cfg {Array} gradients (optional) Define a set of gradients that can be used as `fill` property in sprites.
         * The gradients array is an array of objects with the following properties:
         *
         * <ul>
         * <li><strong>id</strong> - string - The unique name of the gradient.</li>
         * <li><strong>angle</strong> - number, optional - The angle of the gradient in degrees.</li>
         * <li><strong>stops</strong> - object - An object with numbers as keys (from 0 to 100) and style objects
         * as values</li>
         * </ul>
         * For example:
         *
         * <pre><code>
         * gradients: [{
         *      id: 'gradientId',
         *      angle: 45,
         *      stops: {
         *          0: {
         *              color: '#555'
         *          },
         *          100: {
         *              color: '#ddd'
         *          }
         *      }
         *  }, {
         *      id: 'gradientId2',
         *      angle: 0,
         *      stops: {
         *          0: {
         *              color: '#590'
         *          },
         *          20: {
         *            color: '#599'
         *          },
         *          100: {
         *              color: '#ddd'
         *          }
         *     }
         * }]
         * </code></pre>
         * Then the sprites can use `gradientId` and `gradientId2` by setting the fill attributes to those ids, for example:
         * <pre><code>
         *    sprite.setAttributes({
         *       fill: 'url(#gradientId)'
         *    }, true);
         * </code></pre>
         */
        gradients: [],

        /**
         * @deprecated 2.1.0 Please implement custom resize event handler.
         * Resize the draw component by the content size of the main surface.
         *
         * Note: It is applied only when there is only one surface
         */
        autoSize: false,

        /**
         * @deprecated 2.1.0 Please implement custom resize event handler.
         * Pan/Zoom the content in main surface to fit the component size.
         *
         * Note: It is applied only when there is only one surface
         */
        viewBox: false,

        /**
         * @deprecated 2.1.0 Please implement custom resize event handler.
         * Fit the main surface to the size of component.
         *
         * Note: It is applied only when there is only one surface
         */
        fitSurface: true,

        background: null,

        sprites: null
    },

    constructor: function (config) {
        config = config || {};
        // If use used `items` config, they are actually using `sprites`
        if (config.items) {
            config.sprites = config.items;
            delete config.items;
        }
        this.callParent(arguments);
        this.frameCallbackId = Ext.draw.fx.Frame.addFrameCallback('renderFrame', this);
    },

    initialize: function () {
        var me = this;
        me.callParent();
        me.on('painted', me.onPainted, me);
    },

    applySprites: function (sprites) {
        // Never update
        if (!sprites) {
            return;
        }
        var ln = sprites.length,
            i, surface;

        for (i = 0; i < ln; i++) {
            if (sprites[i].surface instanceof Ext.draw.Surface) {
                surface = sprites[i].surface;
            } else if (Ext.isString(sprites[i].surface)) {
                surface = this.getSurface(sprites[i].surface);
            } else {
                surface = this.getSurface('main');
            }
            surface.add(sprites[i]);
        }
    },

    getElementConfig: function () {
        return {
            reference: 'element',
            className: 'x-container',
            children: [
                {
                    reference: 'innerElement',
                    className: 'x-inner',
                    children: [
                        {
                            reference: 'watermarkElement',
                            cls: 'x-chart-watermark',
                            html: Ext.draw.Component.WATERMARK
                        }
                    ]
                }
            ]
        };
    },

    updateBackground: function (background) {
        this.element.setStyle({
            background: background
        });
    },

    onPainted: function () {
        this.renderFrame();
        this.on('resize', 'onResize', this);
        this.fireEvent('resize', this);
    },

    /**
     * @protected
     */
    onPlaceWatermark: function () {
        // Do nothing
    },

    onResize: function () {
        //<deprecated product=touch since=2.1>
        var me = this,
            size = me.element.getSize(),
            surfaces = me.getItems(),
            surface, bbox, mat, zoomX, zoomY, zoom;

        if (surfaces.length == 1) {
            surface = surfaces.get(0);
            if (this.getAutoSize()) {
                bbox = surface.getItems().getBBox();
                mat = new Ext.draw.Matrix();
                mat.prepend(1, 0, 0, 1, -bbox.x, -bbox.y);
                surface.matrix = mat;
                surface.inverseMatrix = mat.inverse();
                surface.setRegion([0, 0, bbox.width, bbox.height]);
                surface.renderFrame();
            } else if (this.getViewBox()) {
                bbox = surface.getItems().getBBox();
                zoomX = size.width / bbox.width;
                zoomY = size.height / bbox.height;
                zoom = Math.min(zoomX, zoomY);
                mat = new Ext.draw.Matrix();
                mat.prepend(
                    zoom, 0, 0, zoom, 
                    size.width * 0.5 + (-bbox.x - bbox.width * 0.5) * zoom, 
                    size.height * 0.5 + (-bbox.y - bbox.height * 0.5) * zoom);
                surface.matrix = mat;
                surface.inverseMatrix = mat.inverse();
                surface.setRegion([0, 0, size.width, size.height]);
                surface.renderFrame();
            } else if (this.getFitSurface()) {
                surface.setRegion([0, 0, size.width, size.height]);
                surface.renderFrame();
            }
        } else if (this.getFitSurface()) {
            this.getItems().each(function (surface) {
                surface.setRegion([0, 0, size.width, size.height]);
                surface.renderFrame();
            });
        }
        //</deprecated>
        this.onPlaceWatermark();
    },

    applySurfaces: function (newSurfaces, oldSurfaces) {
        oldSurfaces = oldSurfaces || new Ext.util.MixedCollection();
        var oldItems = oldSurfaces.items.slice(0),
            newIds = {},
            i, id;
        if (Ext.isObject(newSurfaces)) {
            newSurfaces = [].concat(newSurfaces);
        }
        if (Ext.isArray(newSurfaces)) {
            for (i = 0; i < newSurfaces.length; i++) {
                newSurfaces[i] = Ext.factory(newSurfaces[i], this.engine, oldSurfaces.get(newSurfaces[i].id));
                newSurfaces[i].setParent(this);
                newIds[newSurfaces[i].id] = newSurfaces[i];
            }
        }
        for (i = 0; i < oldItems.length; i++) {
            if (!newIds[oldItems[i].id]) {
                oldSurfaces.remove(oldItems[i]);
            } else {
                delete newIds[oldItems[i].id];
            }
        }
        for (id in newIds) {
            oldSurfaces.add(newIds[id]);
        }
        this.fireEvent('surfaceschanged', this, oldSurfaces);
        return oldSurfaces;
    },

    /**
     *
     * @param [id]
     * @return Ext.draw.Surface
     */
    getSurface: function (id) {
        id = this.getId() + '-' + (id || 'main');
        var me = this,
            surfaces = me.getItems(),
            surface = surfaces.get(id),
            size;

        if (!surface) {
            surface = me.add({xclass: me.engine, id: id});
            if (me.getFitSurface()) {
                size = me.element.getSize();
                surface.setRegion([0, 0, size.width, size.height]);
            }
            surface.renderFrame();
        }
        return surface;
    },

    /**
     * Add a gradient definition to the Surface. Note that in some surface engines, adding
     * a gradient via this method will not take effect if the surface has already been rendered.
     * Therefore, it is preferred to pass the gradients as an item to the surface config, rather
     * than calling this method, especially if the surface is rendered immediately (e.g. due to
     * 'renderTo' in its config). For more information on how to create gradients in the Chart
     * configuration object please refer to {@link Ext.chart.Chart}.
     *
     * The gradient object to be passed into this method is composed by:
     *
     *
     *  - **id** - string - The unique name of the gradient.
     *  - **angle** - number, optional - The angle of the gradient in degrees.
     *  - **stops** - object - An object with numbers as keys (from 0 to 100) and style objects as values.
     *
     *
     * For example:
     *            drawComponent.getSurface('main').addGradient({
     *               id: 'gradientId',
     *              angle: 45,
     *              stops: {
     *                  0: {
     *                      color: '#555'
     *                  },
     *                  100: {
     *                      color: '#ddd'
     *                  }
     *              }
     *          });
     */
    addGradient: function (grad) {
        var me = this;
        grad = me.parseGradient(grad);
        me.getGradients()[grad.id] = grad;
    },

    parseGradient: Ext.emptyFn,

    renderFrame: function () {
        var me = this,
            i, ln, bbox,
            surfaces = me.getItems();

        for (i = 0, ln = surfaces.length; i < ln; i++) {
            surfaces.items[i].renderFrame();
        }

        //<deprecated product=touch since=2.2>
        // TODO: Throw a deprecation message
        if (surfaces.length == 1 && me.getAutoSize()) {
            bbox = me.getSurface().getItems().getBBox();
            me.setSize(Math.ceil(bbox.width) + 1, Math.ceil(bbox.height) + 1);
        }
        //</deprecated>
    },

    destroy: function () {
        Ext.draw.fx.Frame.removeFrameCallback(this.frameCallbackId);
        this.callParent();
    }
}, function () {
    if (Ext.os.is.Android4 && !Ext.browser.is.Chrome) {
        Ext.draw.Component.prototype.engine = 'Ext.draw.engine.Svg';
    }
});
