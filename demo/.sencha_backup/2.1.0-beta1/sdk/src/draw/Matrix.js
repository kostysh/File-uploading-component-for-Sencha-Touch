/**
 * @class Ext.draw.Matrix
 * @private
 * Utility class to calculate [affine transformation](http://en.wikipedia.org/wiki/Affine_transformation) matrix.
 *
 * This class is compatible with SVGMatrix except using Number as its component rather than floats.
 */
Ext.define('Ext.draw.Matrix', {

    statics: {
        /**
         * Return the affine matrix that transform two points (x0, y0) and (x1, y1) to (x0p, y0p) and (x1p, y1p)
         * @param x0
         * @param y0
         * @param x1
         * @param y1
         * @param x0p
         * @param y0p
         * @param x1p
         * @param y1p
         */
        createAffineMatrixFromTwoPair: function (x0, y0, x1, y1, x0p, y0p, x1p, y1p) {
            var dx = x1 - x0,
                dy = y1 - y0,
                dxp = x1p - x0p,
                dyp = y1p - y0p,
                r = dx * dx + dy * dy,
                a = dx * dxp + dy * dyp,
                b = dxp * dy - dx * dyp,
                c = -(dx * dxp * x0) - dy * dyp * x0 - dxp * dy * y0 + dx * dyp * y0,
                d = -(dxp * dy) + dx * dyp,
                e = dx * dxp + dy * dyp,
                f = dxp * dy * x0 - dx * dyp * x0 - dx * dxp * y0 - dy * dyp * y0;

            return new this(a / r, d / r, b / r, e / r, c / r + x0p, f / r + y0p);
        },

        /**
         * Return the affine matrix that transform two points (x0, y0) and (x1, y1) to (x0p, y0p) and (x1p, y1p)
         * @param x0
         * @param y0
         * @param x1
         * @param y1
         * @param x0p
         * @param y0p
         * @param x1p
         * @param y1p
         */
        createPanZoomFromTwoPair: function (x0, y0, x1, y1, x0p, y0p, x1p, y1p) {
            if (arguments.length == 2) {
                return this.createPanZoomFromTwoPair.apply(this, x0.concat(y0));
            }
            var dx = x1 - x0,
                dy = y1 - y0,
                cx = (x0 + x1) * 0.5,
                cy = (y0 + y1) * 0.5,
                dxp = x1p - x0p,
                dyp = y1p - y0p,
                cxp = (x0p + x1p) * 0.5,
                cyp = (y0p + y1p) * 0.5,
                r = dx * dx + dy * dy,
                rp = dxp * dxp + dyp * dyp,
                scale = Math.sqrt(rp / r);

            return new this(scale, 0, 0, scale, cxp - scale * cx, cyp - scale * cy);
        },


        /**
         * Create a flyweight to wrap the given array.
         * The flyweight will directly refer the object and the elements can be changed by other methods.
         *
         * Do not hold the instance of flyweight matrix.
         *
         * @param {Array} elements
         * @return {Ext.draw.Matrix}
         */
        fly: (function () {
            var flyMatrix = null,
                simplefly = function (elements) {
                    flyMatrix.elements = elements;
                    return flyMatrix;
                };

            return function (elements) {
                if (!flyMatrix) {
                    flyMatrix = new Ext.draw.Matrix();
                }
                flyMatrix.elements = elements;
                Ext.draw.Matrix.fly = simplefly;
                return flyMatrix;
            };
        })(),

        create: function (mat) {
            if (mat instanceof this) {
                return mat;
            }
            return new this(mat);
        }
    },

    /**
     * Create an affine transform matrix.
     *
     * @param xx Coefficient from x to x
     * @param xy Coefficient from x to y
     * @param yx Coefficient from y to x
     * @param yy Coefficient from y to y
     * @param dx Offset of x
     * @param dy Offset of y
     */
    constructor: function (xx, xy, yx, yy, dx, dy) {
        if (xx && xx.length == 6) {
            this.elements = xx.slice();
        } else if (xx !== undefined) {
            this.elements = [xx, xy, yx, yy, dx, dy];
        } else {
            this.elements = [1, 0, 0, 1, 0, 0];
        }
    },

    /**
     * Prepend a matrix onto the current.
     * Note: The given transform will come after the current one.
     *
     * @param xx Coefficient from x to x
     * @param xy Coefficient from x to y
     * @param yx Coefficient from y to x
     * @param yy Coefficient from y to y
     * @param dx Offset of x
     * @param dy Offset of y
     * @returns this
     */
    prepend: function (xx, xy, yx, yy, dx, dy) {
        var elements = this.elements,
            xx0 = elements[0],
            xy0 = elements[1],
            yx0 = elements[2],
            yy0 = elements[3],
            dx0 = elements[4],
            dy0 = elements[5];

        elements[0] = xx * xx0 + yx * xy0;
        elements[1] = xy * xx0 + yy * xy0;
        elements[2] = xx * yx0 + yx * yy0;
        elements[3] = xy * yx0 + yy * yy0;
        elements[4] = xx * dx0 + yx * dy0 + dx;
        elements[5] = xy * dx0 + yy * dy0 + dy;
        return this;
    },

    prependMatrix: function (matrix) {
        return this.prepend.apply(this, matrix.elements);
    },

    /**
     * Postpend a matrix onto the current.
     * Note: The given transform will come before the current one.
     *
     * @param xx Coefficient from x to x
     * @param xy Coefficient from x to y
     * @param yx Coefficient from y to x
     * @param yy Coefficient from y to y
     * @param dx Offset of x
     * @param dy Offset of y
     * @returns this
     */
    postpend: function (xx, xy, yx, yy, dx, dy) {
        var elements = this.elements,
            xx0 = elements[0],
            xy0 = elements[1],
            yx0 = elements[2],
            yy0 = elements[3],
            dx0 = elements[4],
            dy0 = elements[5];

        elements[0] = xx * xx0 + xy * yx0;
        elements[1] = xx * xy0 + xy * yy0;
        elements[2] = yx * xx0 + yy * yx0;
        elements[3] = yx * xy0 + yy * yy0;
        elements[4] = dx * xx0 + dy * yx0 + dx0;
        elements[5] = dx * xy0 + dy * yy0 + dy0;
        return this;
    },

    postpendMatrix: function (matrix) {
        return this.postpend.apply(this, matrix.elements);
    },

    set: function (xx, xy, yx, yy, dx, dy) {
        var elements = this.elements;

        elements[0] = xx;
        elements[1] = xy;
        elements[2] = yx;
        elements[3] = yy;
        elements[4] = dx;
        elements[5] = dy;
        return this;
    },

    /**
     * Return a new matrix represents the opposite transformation of the current one.
     *
     * @return {Ext.draw.Matrix}
     */
    inverse: function (target) {
        var elements = this.elements,
            a = elements[0],
            b = elements[1],
            c = elements[2],
            d = elements[3],
            e = elements[4],
            f = elements[5],
            rDim = 1 / (a * d - b * c);

        a *= rDim;
        b *= rDim;
        c *= rDim;
        d *= rDim;
        if (target) {
            target.elements = [d, -b, -c, a, c * f - d * e, b * e - a * f];
            return target;
        } else {
            return new Ext.draw.Matrix(d, -b, -c, a, c * f - d * e, b * e - a * f);
        }
    },

    translate: function (x, y, prepend) {
        if (prepend) {
            return this.prepend(1, 0, 0, 1, x, y);
        } else {
            return this.postpend(1, 0, 0, 1, x, y);
        }
    },

    scale: function (sx, sy, scx, scy, prepend) {
        var me = this;

        // null or undefined
        if (sy == null) {
            sy = sx;
        }
        if (scx === undefined) {
            scx = 0;
        }
        if (scy === undefined) {
            scy = 0;
        }

        if (prepend) {
            return me.prepend(sx, 0, 0, sy, scx - scx * sx, scy - scy * sy);
        } else {
            return me.postpend(sx, 0, 0, sy, scx - scx * sx, scy - scy * sy);
        }
    },

    /**
     *
     * @param angle Radians to rotate
     * @param {Number} [rcx] Center of rotation.
     * @param {Number} [rcy] Center of rotation.
     * @return {Ext.draw.Matrix} result
     */
    rotate: function (angle, rcx, rcy, prepend) {
        var me = this,
            cos = Math.cos(angle),
            sin = Math.sin(angle);

        rcx = rcx || 0;
        rcy = rcy || 0;

        if (prepend) {
            return me.prepend(
                cos, sin,
                -sin, cos,
                rcx - cos * rcx + rcy * sin,
                rcy - cos * rcy - rcx * sin
            );
        } else {
            return me.postpend(
                cos, sin,
                -sin, cos,
                rcx - cos * rcx + rcy * sin,
                rcy - cos * rcy - rcx * sin
            );
        }
    },

    rotateFromVector: function (x, y) {
        var me = this,
            d = Math.sqrt(x * x + y * y),
            cos = x / d,
            sin = y / d;

        return me.postpend(cos, sin, -sin, cos, 0, 0);
    },

    clone: function () {
        return new Ext.draw.Matrix(this.elements);
    },

    flipX: function () {
        return this.postpend(-1, 0, 0, 1, 0, 0);
    },

    flipY: function () {
        return this.postpend(1, 0, 0, -1, 0, 0);
    },

    skewX: function (angle) {
        return this.postpend(1, Math.tan(angle), 0, -1, 0, 0);
    },

    skewY: function (angle) {
        return this.postpend(1, 0, Math.tan(angle), -1, 0, 0);
    },

    reset: function () {
        return this.set(1, 0, 0, 1, 0, 0);
    },

    // split to {{1,c,0},{b,1,0},{0,0,1}}.{{xx,0,dx},{0,yy,dy},{0,0,1}}
    precisionCompensate: function (devicePixelRatio) {
        var elements = this.elements,
            x2x = elements[0],
            x2y = elements[1],
            y2x = elements[2],
            y2y = elements[3],
            newDx = elements[4],
            newDy = elements[5],
            r = x2y * y2x - x2x * y2y;

        return {
            b: devicePixelRatio * x2y / x2x,
            c: devicePixelRatio * y2x / y2y,
            d: devicePixelRatio,
            xx: x2x / devicePixelRatio,
            yy: y2y / devicePixelRatio,
            dx: (newDy * x2x * y2x - newDx * x2x * y2y) / r / devicePixelRatio,
            dy: (newDx * x2y * y2y - newDy * x2x * y2y) / r / devicePixelRatio
        };
    },

    precisionCompensateRect: function (devicePixelRatio) {
        var elements = this.elements,
            x2x = elements[0],
            x2y = elements[1],
            y2x = elements[2],
            y2y = elements[3],
            newDx = elements[4],
            newDy = elements[5],
            yxOnXx = y2x / x2x;

        return {
            b: devicePixelRatio * x2y / x2x,
            c: devicePixelRatio * yxOnXx,
            d: devicePixelRatio * y2y / x2x,
            xx: x2x / devicePixelRatio,
            yy: x2x / devicePixelRatio,
            dx: (newDy * y2x - newDx * y2y) / (x2y * yxOnXx - y2y) / devicePixelRatio,
            dy: -(newDy * x2x - newDx * x2y) / (x2y * yxOnXx - y2y) / devicePixelRatio
        }
    },

    x: function (x, y) {
        var elements = this.elements;

        return x * elements[0] + y * elements[2] + elements[4];
    },

    y: function (x, y) {
        var elements = this.elements;

        return x * elements[1] + y * elements[3] + elements[5];
    },

    get: function (i, j) {
        return +this.elements[i + j * 2].toFixed(4);
    },


    /**
     * @param point
     */
    transformPoint: function (point) {
        var elements = this.elements;

        return [
            point[0] * elements[0] + point[1] * elements[2] + elements[4],
            point[0] * elements[1] + point[1] * elements[3] + elements[5]
        ];
    },

    /**
     *
     * @param {Object} bbox Given as {x: Number, y: Number, width: Number, height: Number}.
     * @param {Number} [radius]
     */
    transformBBox: function (bbox, radius) {
        var elements = this.elements,
            l = bbox.x,
            t = bbox.y,
            w0 = bbox.width * 0.5,
            h0 = bbox.height * 0.5,
            xx = elements[0],
            xy = elements[1],
            yx = elements[2],
            yy = elements[3],
            cx = l + w0,
            cy = t + h0,
            w, h, scales;

        if (radius) {
            w0 -= radius;
            h0 -= radius;
            scales = [
                Math.sqrt(elements[0] * elements[0] + elements[2] * elements[2]),
                Math.sqrt(elements[1] * elements[1] + elements[3] * elements[3])
            ];
            w = Math.abs(w0 * xx) + Math.abs(h0 * yx) + Math.abs(scales[0] * radius);
            h = Math.abs(w0 * xy) + Math.abs(h0 * yy) + Math.abs(scales[1] * radius);
        } else {
            w = Math.abs(w0 * xx) + Math.abs(h0 * yx);
            h = Math.abs(w0 * xy) + Math.abs(h0 * yy);
        }

        return {
            x: cx * xx + cy * yx + elements[4] - w,
            y: cx * xy + cy * yy + elements[5] - h,
            width: w + w,
            height: h + h
        };
    },

    /**
     * Note: will change the original list
     * @param list
     */
    transformList: function (list) {
        var elements = this.elements,
            xx = elements[0], yx = elements[2], dx = elements[4],
            xy = elements[1], yy = elements[3], dy = elements[5],
            ln = list.length,
            p, i;

        for (i = 0; i < ln; i++) {
            p = list[i];
            list[i] = [
                p[0] * xx + p[1] * yx + dx,
                p[0] * xy + p[1] * yy + dy
            ];
        }
        return list;
    },

    /**
     * Determines whether this matrix is an identity matrix (no transform)
     * @return {Boolean}
     */
    isIdentity: function () {
        var elements = this.elements;

        return elements[0] === 1 &&
            elements[1] === 0 &&
            elements[2] === 0 &&
            elements[3] === 1 &&
            elements[4] === 0 &&
            elements[5] === 0;
    },

    /**
     * Determines if this matrix has the same values as another matrix
     * @param {Ext.draw.Matrix} matrix
     * @return {Boolean}
     */
    equals: function (matrix) {
        var elements = this.elements,
            elements2 = matrix.elements;

        return elements[0] === elements2[0] &&
            elements[1] === elements2[1] &&
            elements[2] === elements2[2] &&
            elements[3] === elements2[3] &&
            elements[4] === elements2[4] &&
            elements[5] === elements2[5];
    },

    toArray: function () {
        var elements = this.elements;

        return [elements[0], elements[2], elements[4], elements[1], elements[3], elements[5]];
    },

    toVerticalArray: function () {
        return this.elements.slice();
    },

    toString: function () {
        var me = this;
        return [me.get(0, 0), me.get(0, 1), me.get(1, 0), me.get(1, 1), 0, 0].join(',');
    },

    offset: function () {
        return [this.elements[4].toFixed(4), this.elements[5].toFixed(4)];
    },

    toContext: function (ctx) {
        ctx.transform.apply(ctx, this.elements);
        return this;
    },

    toSvg: function () {
        return "matrix(" + this.elements.join(',') + ")";
    },

    getScales: function () {
        var elements = this.elements;

        return [
            Math.sqrt(elements[0] * elements[0] + elements[2] * elements[2]),
            Math.sqrt(elements[1] * elements[1] + elements[3] * elements[3])
        ];
    },

    getScale: function () {
        var elements = this.elements;

        return Math.sqrt(elements[0] * elements[0] + elements[2] * elements[2]);
    },

    getXX: function () {
        return this.elements[0];
    },

    getXY: function () {
        return this.elements[1];
    },

    getYX: function () {
        return this.elements[2];
    },

    getYY: function () {
        return this.elements[3];
    },

    getDX: function () {
        return this.elements[4];
    },

    getDY: function () {
        return this.elements[5];
    },

    /**
     * Split matrix into Translate Scale, Shear, and Rotate
     */
    split: function () {
        function norm(a) {
            return a[0] * a[0] + a[1] * a[1];
        }

        function normalize(a) {
            var mag = Math.sqrt(norm(a));
            a[0] /= mag;
            a[1] /= mag;
        }

        var elements = this.elements,
            out = {
                translateX: elements[4],
                translateY: elements[5]
            },
            row;

        // scale and shear
        row = [
            [elements[0], elements[2]],
            [elements[1], elements[3]]
        ];
        out.scaleX = Math.sqrt(norm(row[0]));
        out.scaleY = Math.sqrt(norm(row[1]));

        normalize(row[0]);
        normalize(row[1]);
        out.shear = row[0][0] * row[1][0] + row[0][1] * row[1][1];
        out.shear /= out.scaleY;

        // rotation
        out.rotation = -Math.atan2(row[0][1], row[0][0]);

        out.isSimple = !+out.shear.toFixed(9) && (!out.rotation || out.scaleX.toFixed(9) == out.scaleY.toFixed(9));

        return out;
    }
}, function () {
    if (Object.defineProperties) {
        var properties = {};

        function registerName(properties, name, i) {
            properties[name] = {
                get: function () {
                    return this.elements[i];
                },
                set: function (val) {
                    this.elements[i] = val;
                }
            };
        }

        // Compatible with SVGMatrix
        // https://developer.mozilla.org/en/DOM/SVGMatrix
        registerName(properties, 'a', 0);
        registerName(properties, 'b', 1);
        registerName(properties, 'c', 2);
        registerName(properties, 'd', 3);
        registerName(properties, 'e', 4);
        registerName(properties, 'f', 5);
        this.prototype.multiply = this.prototype.postpendMatrix;
        Object.defineProperties(this.prototype, properties);
    }
});
