/**
 * @class Ext.draw.engine.Canvas
 * @extends Ext.draw.Surface
 *
 * Provides specific methods to draw with 2D Canvas element.
 */
Ext.define('Ext.draw.engine.Canvas', {
    // <debug>
    debugBBox: false,
    // </debug>

    devicePixelRatio: 1,

    splitThreshold: 1800,

    extend: 'Ext.draw.Surface',

    config: {
        highPrecision: false
    },

    uses: [
        'Ext.draw.fx.Frame'
    ],

    getElementConfig: function () {
        return {
            reference: 'element',
            style: {
                position: 'absolute'
            },
            children: [
                {
                    reference: 'innerElement',
                    style: {
                        width: '100%',
                        height: '100%',
                        position: 'relative'
                    }
                }
            ]
        };
    },

    createCanvas: function () {
        var canvas = Ext.Element.create({
                tag: 'canvas',
                cls: 'x-surface'
            }),
            ctx = canvas.dom.getContext('2d');

        ctx.fillStroke = function (attr, transformFillStroke) {
            var oldShadowColor = ctx.shadowColor,
                fillStyle = ctx.fillStyle,
                strokeStyle = ctx.strokeStyle,
                alpha = ctx.globalAlpha,
                fillOpacity = ctx.fillOpacity,
                strokeOpacity = ctx.strokeOpacity,
                rgba = 'rgba(0, 0, 0, 0)',
                rgba0 = 'rgba(0, 0, 0, 0.0)';

            if (transformFillStroke === undefined) {
                transformFillStroke = attr.transformFillStroke;
            }

            if (!transformFillStroke) {
                attr.inverseMatrix.toContext(ctx);
            }

            if (fillStyle != rgba && fillStyle != rgba0 && fillOpacity != 0) {
                if (fillOpacity != 1) {
                    ctx.globalAlpha = alpha * fillOpacity;
                }
                ctx.fill();
                if (oldShadowColor != rgba) {
                    ctx.shadowColor = rgba;
                }
            }

            if (strokeStyle != rgba && strokeStyle != rgba0 && strokeOpacity != 0) {
                if (strokeOpacity) {
                    ctx.globalAlpha = alpha * strokeOpacity;
                } else if (fillOpacity != 1) {
                    ctx.globalAlpha = alpha;
                }
                ctx.stroke();
                if (oldShadowColor != rgba) {
                    ctx.shadowColor = oldShadowColor;
                }
            }
        };

        this.getHighPrecision() ? this.enablePrecisionCompensation(ctx) : this.disablePrecisionCompensation(ctx);

        this.innerElement.dom.appendChild(canvas.dom);
        this.canvases.push(canvas);
        this.contexts.push(ctx);
    },

    initElement: function () {
        this.callParent();
        this.canvases = [];
        this.contexts = [];
        this.createCanvas();
        this.activeCanvases = 0;
    },

    updateHighPrecision: function (pc) {
        var contexts = this.contexts,
            ln = contexts.length,
            i, context;

        for (i = 0; i < ln; i++) {
            context = contexts[i];
            if (pc) {
                this.enablePrecisionCompensation(context);
            } else {
                this.disablePrecisionCompensation(context);
            }
        }
    },

    precisionMethods: {
        rect: false,
        fillRect: false,
        strokeRect: false,
        clearRect: false,
        moveTo: false,
        lineTo: false,
        arc: false,
        arcTo: false,
        save: false,
        restore: false,
        updatePrecisionCompensate: false,
        setTransform: false,
        transform: false,
        scale: false,
        translate: false,
        rotate: false,
        quadraticCurveTo: false,
        bezierCurveTo: false,
        createLinearGradient: false,
        createRadialGradient: false,
        fillText: false,
        strokeText: false,
        drawImage: false
    },

    disablePrecisionCompensation: function (ctx) {
        var precisionMethods = this.precisionMethods,
            name;
        for (name in precisionMethods) {
            delete ctx[name];
        }

        ctx.ellipse = function (cx, cy, rx, ry, rotation, start, end, anticlockwise) {
            ctx.rotate();
        };
        this.setDirty(true);
    },

    enablePrecisionCompensation: function (ctx) {
        var surface = this,
            xx = 1, yy = 1,
            dx = 0, dy = 0,
            matrix = new Ext.draw.Matrix(),
            transStack = [],
            originalCtx = ctx.constructor.prototype;

        var override = {
            rect: function (x, y, w, h) {
                return originalCtx.rect.call(this, x * xx + dx, y * yy + dy, w * xx, h * yy);
            },
            fillRect: function (x, y, w, h) {
                this.updatePrecisionCompensateRect();
                originalCtx.fillRect.call(this, x * xx + dx, y * yy + dy, w * xx, h * yy);
                this.updatePrecisionCompensate();
            },
            strokeRect: function (x, y, w, h) {
                this.updatePrecisionCompensateRect();
                originalCtx.strokeRect.call(this, x * xx + dx, y * yy + dy, w * xx, h * yy);
                this.updatePrecisionCompensate();
            },
            clearRect: function (x, y, w, h) {
                return originalCtx.clearRect.call(this, x * xx + dx, y * yy + dy, w * xx, h * yy);
            },
            moveTo: function (x, y) {
                return originalCtx.moveTo.call(this, x * xx + dx, y * yy + dy);
            },
            lineTo: function (x, y) {
                return originalCtx.lineTo.call(this, x * xx + dx, y * yy + dy);
            },
            arc: function (x, y, radius, startAngle, endAngle, anticlockwise) {
                this.updatePrecisionCompensateRect();
                originalCtx.arc.call(this, x * xx + dx, y * xx + dy, radius * xx, startAngle, endAngle, anticlockwise);
                this.updatePrecisionCompensate();
            },
            arcTo: function (x1, y1, x2, y2, radius) {
                this.updatePrecisionCompensateRect();
                originalCtx.arcTo.call(this, x1 * xx + dx, y1 * yy + dy, x2 * xx + dx, y2 * yy + dy, radius * xx);
                this.updatePrecisionCompensate();
            },
            save: function () {
                transStack.push(matrix);
                matrix = matrix.clone();
                return originalCtx.save.call(this);
            },
            restore: function () {
                matrix = transStack.pop();
                originalCtx.restore.call(this);
                this.updatePrecisionCompensate();
            },
            updatePrecisionCompensate: function () {
                var comp = matrix.precisionCompensate(surface.devicePixelRatio);
                xx = comp.xx;
                yy = comp.yy;
                dx = comp.dx;
                dy = comp.dy;
                return originalCtx.setTransform.call(this, surface.devicePixelRatio, comp.b, comp.c, comp.d, 0, 0);
            },
            updatePrecisionCompensateRect: function () {
                var comp = matrix.precisionCompensateRect(surface.devicePixelRatio);
                xx = comp.xx;
                yy = comp.yy;
                dx = comp.dx;
                dy = comp.dy;
                return originalCtx.setTransform.call(this, surface.devicePixelRatio, comp.b, comp.c, comp.d, 0, 0);
            },
            setTransform: function (x2x, x2y, y2x, y2y, newDx, newDy) {
                matrix.set(x2x, x2y, y2x, y2y, newDx, newDy);
                this.updatePrecisionCompensate();
            },
            transform: function (x2x, x2y, y2x, y2y, newDx, newDy) {
                matrix.postpend(x2x, x2y, y2x, y2y, newDx, newDy);
                this.updatePrecisionCompensate();
            },
            scale: function (sx, sy) {
                return this.transform(sx, 0, 0, sy, 0, 0);
            },
            translate: function (dx, dy) {
                return this.transform(1, 0, 0, 1, dx, dy);
            },
            rotate: function (radians) {
                var cos = Math.cos(radians),
                    sin = Math.sin(radians);
                return this.transform(cos, sin, -sin, cos, 0, 0);
            },
            quadraticCurveTo: function (cx, cy, x, y) {
                return originalCtx.quadraticCurveTo.call(this,
                    cx * xx + dx,
                    cy * yy + dy,
                    x * xx + dx,
                    y * yy + dy
                );
            },
            bezierCurveTo: function (c1x, c1y, c2x, c2y, x, y) {
                return originalCtx.bezierCurveTo.call(this,
                    c1x * xx + dx,
                    c1y * yy + dy,
                    c2x * xx + dx,
                    c2y * yy + dy,
                    x * xx + dx,
                    y * yy + dy
                );
            },
            createLinearGradient: function (x0, y0, x1, y1) {
                this.updatePrecisionCompensateRect();
                var grad = originalCtx.createLinearGradient.call(this,
                    x0 * xx + dx,
                    y0 * yy + dy,
                    x1 * xx + dx,
                    y1 * yy + dy
                );
                this.updatePrecisionCompensate();
                return grad;
            },
            createRadialGradient: function (x0, y0, r0, x1, y1, r1) {
                this.updatePrecisionCompensateRect();
                var grad = originalCtx.createLinearGradient.call(this,
                    x0 * xx + dx,
                    y0 * xx + dy,
                    r0 * xx,
                    x1 * xx + dx,
                    y1 * xx + dy,
                    r1 * xx
                );
                this.updatePrecisionCompensate();
                return grad;
            },
            fillText: function (text, x, y, maxWidth) {
                originalCtx.setTransform.apply(this, matrix.elements);
                if (typeof maxWidth == 'undefined') {
                    originalCtx.fillText.call(this, text, x, y);
                } else {
                    originalCtx.fillText.call(this, text, x, y, maxWidth);
                }
                this.updatePrecisionCompensate();
            },
            strokeText: function (text, x, y, maxWidth) {
                originalCtx.setTransform.apply(this, matrix.elements);
                if (typeof maxWidth == 'undefined') {
                    originalCtx.strokeText.call(this, text, x, y);
                } else {
                    originalCtx.strokeText.call(this, text, x, y, maxWidth);
                }
                this.updatePrecisionCompensate();
            },
            fill: function () {
                this.updatePrecisionCompensateRect();
                originalCtx.fill.call(this);
                this.updatePrecisionCompensate();
            },
            stroke: function () {
                this.updatePrecisionCompensateRect();
                originalCtx.stroke.call(this);
                this.updatePrecisionCompensate();
            },
            drawImage: function (img_elem, arg1, arg2, arg3, arg4, dst_x, dst_y, dw, dh) {
                switch (arguments.length) {
                    case 3:
                        return originalCtx.drawImage.call(this, img_elem, arg1 * xx + dx, arg2 * yy + dy);
                    case 5:
                        return originalCtx.drawImage.call(this, img_elem, arg1 * xx + dx, arg2 * yy + dy, arg3 * xx, arg4 * yy);
                    case 9:
                        return originalCtx.drawImage.call(this, img_elem, arg1, arg2, arg3, arg4, dst_x * xx + dx, dst_y * yy * dy, dw * xx, dh * yy);
                }
            }
        };
        Ext.apply(ctx, override);
        this.setDirty(true);
        return ctx;
    },

    //stores the gradient configuration into a hashmap
    parseGradient: function (gradient) {
        return Ext.draw.Draw.parseGradient(gradient);
    },

    updateRegion: function (region) {
        this.callParent([region]);

        var l = Math.floor(region[0]),
            t = Math.floor(region[1]),
            r = Math.ceil(region[0] + region[2]),
            b = Math.ceil(region[1] + region[3]),
            devicePixelRatio = this.devicePixelRatio,
            w = r - l,
            h = b - t,
            splitThreshold = Math.round(this.splitThreshold / devicePixelRatio),
            splits = Math.ceil(w / splitThreshold),
            activeCanvases = this.activeCanvases,
            i, offsetX, dom, leftWidth;

        for (i = 0, offsetX = 0; i < splits; i++, offsetX += splitThreshold) {
            if (i >= this.canvases.length) {
                this.createCanvas();
            }
            dom = this.canvases[i].dom;
            dom.style.left = offsetX + 'px';
            if (h != dom.height) {
                dom.height = Math.ceil(h * devicePixelRatio);
                dom.style.height = h + 'px';
            }
            leftWidth = Math.min(splitThreshold, w - offsetX);
            if (leftWidth != dom.width) {
                dom.width = Math.ceil(leftWidth * devicePixelRatio);
                dom.style.width = leftWidth + 'px';
            }
            this.applyDefaults(this.contexts[i]);
        }

        for (; i < activeCanvases; i++) {
            dom = this.canvases[i].dom;
            dom.width = 0;
            dom.height = 0;
        }
        this.activeCanvases = splits;
        this.clear();
    },

    clearTransform: function () {
        var me = this,
            activeCanvases = me.activeCanvases,
            i, ctx;

        for (i = 0; i < activeCanvases; i++) {
            ctx = me.contexts[i];
            ctx.translate(-me.splitThreshold * i, 0);
            ctx.scale(me.devicePixelRatio, me.devicePixelRatio);
            me.matrix.toContext(ctx);
        }

    },

    /**
     * Renders a single sprite into the canvas (without clearing the canvas).
     *
     * @param {Ext.draw.sprite.Sprite} sprite The Sprite to be rendered.
     */
    renderSprite: function (sprite) {
        var me = this,
            region = me.getRegion(),
            surfaceMatrix = me.matrix,
            parent = sprite.getParent(),
            matrix = Ext.draw.Matrix.fly([1, 0, 0, 1, 0, 0]),
            bbox, tbox, i, offsetX, ctx, width, left, top, right, bottom;

        while (parent && (parent !== me)) {
            matrix.prependMatrix(parent.matrix || parent.attr && parent.attr.matrix);
            parent = parent.getParent();
        }
        matrix.prependMatrix(surfaceMatrix);
        bbox = matrix.transformBBox(sprite.getBBox());

        // Clear dirty flags that aren't used by the Canvas renderer
        sprite._dirty = false;
        if (sprite.attr.hidden) {
            return;
        }

        for (i = 0, offsetX = 0; i < me.activeCanvases; i++, offsetX += me.splitThreshold / me.devicePixelRatio) {
            ctx = me.contexts[i];
            width = Math.max(region[2] - offsetX, me.splitThreshold / me.devicePixelRatio);
            left = offsetX;
            top = 0;
            right = left + width;
            bottom = top + region[3];

            if (bbox.x > right ||
                bbox.x + bbox.width < left ||
                bbox.y > bottom ||
                bbox.y + bbox.height < top) {
                continue;
            }

            sprite.applyTransformations();
            ctx.save();
            // Set attributes to context.
            sprite.useAttributes(ctx);
            // Render shape
            sprite.render(this, ctx, [left, top, width, bottom - top]);
            ctx.restore();
            // <debug>
            if (sprite instanceof Ext.draw.sprite.Text && sprite.divBased) {
                break;
            }
            if (this.debugBBox) {
                ctx.save();
                bbox = sprite.getBBox(true);
                tbox = sprite.getBBox();
                sprite.attr.matrix.toContext(ctx);
                ctx.beginPath();
                ctx.moveTo(bbox.x, bbox.y);
                ctx.lineTo(bbox.x + bbox.width, bbox.y);
                ctx.lineTo(bbox.x + bbox.width, bbox.y + bbox.height);
                ctx.lineTo(bbox.x, bbox.y + bbox.height);
                ctx.closePath();
                ctx.strokeStyle = 'red';
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.stroke();
                me.matrix.toContext(ctx);
                ctx.beginPath();
                ctx.moveTo(tbox.x, tbox.y);
                ctx.lineTo(tbox.x + tbox.width, tbox.y);
                ctx.lineTo(tbox.x + tbox.width, tbox.y + tbox.height);
                ctx.lineTo(tbox.x, tbox.y + tbox.height);
                ctx.closePath();
                ctx.strokeStyle = 'green';
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
            // </debug>
        }
    },

    cropByViewport: function (path, matrix, band) {
        if (typeof band === 'undefined') {
            band = 0.5;
        }
        var inv = this.matrix.clone(),
            region = this.getRegion(),
            ratio = this.devicePixelRatio,
            left = 0,
            top = 0,
            width = region[2] * ratio,
            height = region[3] * ratio,
            box;
        inv.add(matrix);
        inv = inv.inverse();
        if (inv.elements[1] === 0 && inv.elements[2] === 0) {
            box = inv.transformList([
                [left - band, top - band],
                [left + width + band , top + height + band]
            ]);
            path = Ext.draw.Draw.cropByRect(path, box[0][0], box[1][0], box[0][1], box[1][1]);
            return path;
        } else {
            box = inv.transformList([
                [left - band, top + height + band],
                [left - band, top - band],
                [left + width + band , top - band],
                [left + width + band , top + height + band]
            ]);
            return Ext.draw.Draw.cropByConvexHull(path, box);
        }
    },

    pathApplier: function (ctx, path, matrix, band) {
        //        path = path.simplified || (path.simplified = Ext.draw.Draw.simplify(path, 0.1));
        //        path = this.cropByViewport(path, matrix, band);
        ctx.beginPath();
        for (var i = 0, j = 0, types = path.types, coords = path.coords, ln = path.types.length; i < ln; i++) {
            switch (types[i]) {
                case "M":
                    ctx.moveTo(coords[j], coords[j + 1]);
                    j += 2;
                    break;
                case "L":
                    ctx.lineTo(coords[j], coords[j + 1]);
                    j += 2;
                    break;
                case "C":
                    ctx.bezierCurveTo(
                        coords[j], coords[j + 1],
                        coords[j + 2], coords[j + 3],
                        coords[j + 4], coords[j + 5]
                    );
                    j += 6;
                    break;
                case "Z":
                    ctx.closePath();
                    break;
                default:
            }
        }

    },

    applyDefaults: function (ctx) {
        ctx.strokeStyle = 'rgba(0,0,0,0)';
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.textAlign = 'start';
        ctx.textBaseline = 'middle';
        ctx.miterLimit = 1;
    },

    /**
     * @private
     * Clears the canvas.
     */
    clear: function () {
        var me = this,
            activeCanvases = this.activeCanvases,
            i, canvas, ctx, width, height;
        for (i = 0; i < activeCanvases; i++) {
            canvas = me.canvases[i].dom;
            ctx = me.contexts[i];
            width = canvas.width;
            height = canvas.height;
            if (Ext.os.is.Android && !Ext.os.is.Android4) {
                // TODO: Verify this is the proper check (Chrome)
                // On chrome this is faster:
                canvas.width = canvas.width;
                // Fill the gap between surface defaults and canvas defaults
                me.applyDefaults(ctx);
            } else {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, width, height);
            }
        }
        me.setDirty(true);
    },

    /**
     * Destroys the Canvas element and prepares it for Garbage Collection.
     */
    destroy: function () {
        var me = this, i = 0, ln = me.canvases;
        delete me.ctx;
        delete me.zIndex;
        for (; i < ln; i++) {
            delete me.contexts[i];
            me.canvases[i].destroy();
        }
        delete me.contexts;
        delete me.canvases;
        me.callParent(arguments);
    }
}, function () {
    this.prototype.devicePixelRatio = window.devicePixelRatio;
    if (Ext.os.is.Android4 && Ext.browser.is.Chrome) {
        this.prototype.splitThreshold = 3000;
    }
});