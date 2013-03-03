/**
 * @class Ext.draw.fx.Parser
 * @singleton
 * @private
 * Provides methods for parsing, computing and serving special values (colors, numbers, etc) that need
 * to be interpolated during an animation.
 */
Ext.define('Ext.draw.fx.Parser', {
    singleton: true,

    compute: function (from, to, delta) {
        return from + (to - from) * delta;
    },

    Color: {
        parseInitial: function (color1, color2) {
            if (Ext.isString(color1)) {
                color1 = Ext.draw.Color.create(color1);
            }
            if (Ext.isString(color2)) {
                color2 = Ext.draw.Color.create(color2);
            }
            if ((color1 instanceof Ext.draw.Color) && (color2 instanceof Ext.draw.Color)) {
                return [
                    [color1.r, color1.g, color1.b, color1.a],
                    [color2.r, color2.g, color2.b, color2.a]
                ];
            } else {
                return [null, color2];
            }
        },
        compute: function (from, to, delta) {
            if (!Ext.isArray(from) || !Ext.isArray(to)) {
                return to || from;
            } else {
                var compute = Ext.draw.fx.Parser.compute;
                return [compute(from[0], to[0], delta), compute(from[1], to[1], delta), compute(from[2], to[2], delta), compute(from[3], to[3], delta)];

            }
        },
        serve: function (array) {
            var color = Ext.draw.Color.fly(array[0], array[1], array[2], array[3]);
            return color.toString();
        }
    },

    Number: {
        parse: function (n) {
            return n === null ? null : +n;
        },

        compute: function (from, to, delta) {
            if (!Ext.isNumber(from) || !Ext.isNumber(to)) {
                return to || from;
            } else {
                return Ext.draw.fx.Parser.compute(from, to, delta);
            }
        }
    },

    String: {
        compute: function (from, to) {
            return to;
        }
    },

    Path: {
        parseInitial: function (from, to) {
            var fromStripes = from.toStripes(),
                toStripes = to.toStripes(),
                i, j,
                fromLength = fromStripes.length, toLength = toStripes.length,
                fromStripe, toStripe,
                length = Math.max(fromLength, toLength),
                lastStripe = toStripes[toLength - 1],
                endPoint = [lastStripe[lastStripe.length - 2], lastStripe[lastStripe.length - 1]];
            for (i = fromLength; i < toLength; i++) {
                fromStripes.push(fromStripes[fromLength - 1].slice(0));
            }
            for (i = toLength; i < fromLength; i++) {
                toStripes.push(endPoint.slice(0));
            }
            length = fromStripes.length;

            toStripes.path = to;
            toStripes.temp = new Ext.draw.path.Path();

            for (i = 0; i < length; i++) {
                fromStripe = fromStripes[i];
                toStripe = toStripes[i];
                fromLength = fromStripe.length;
                toLength = toStripe.length;
                toStripes.temp.types.push('M');
                for (j = toLength; j < fromLength; j += 6) {
                    toStripe.push(endPoint[0], endPoint[1], endPoint[0], endPoint[1], endPoint[0], endPoint[1]);
                }

                lastStripe = fromStripes[toLength - 1];
                endPoint = [lastStripe[lastStripe.length - 2], lastStripe[lastStripe.length - 1]];
                for (j = fromLength; j < toLength; j += 6) {
                    fromStripe.push(endPoint[0], endPoint[1], endPoint[0], endPoint[1], endPoint[0], endPoint[1]);
                }
                for (i = 0; i < toStripe.length; i++) {
                    toStripe[i] -= fromStripe[i];
                }
                for (i = 2; i < toStripe.length; i += 6) {
                    toStripes.temp.types.push('C');
                }
            }

            return [fromStripes, toStripes];
        },

        compute: function (fromStripes, toStripes, delta) {
            if (delta >= 1) {
                return toStripes.path;
            }
            var i = 0, ln = fromStripes.length,
                j = 0, ln2, from, to,
                temp = toStripes.temp.coords, pos = 0;
            for (; i < ln; i++) {
                from = fromStripes[i];
                to = toStripes[i];
                ln2 = from.length;
                for (j = 0; j < ln2; j++) {
                    temp[pos++] = to[j] * delta + from[j];
                }
            }
            return toStripes.temp;
        }
    },

    Data: {
        compute: function (from, to, delta) {
            var lf = from.length - 1,
                lt = to.length - 1,
                ans = new Array(lt),
                f, t, i;

            for (i = 0; i <= lt; i++) {
                f = from[Math.round(i / lt * lf)];
                t = to[i];
                ans[i] = (t - f) * delta + f;
            }
            return ans;
        }
    },

    Text: {
        compute: function (from, to, delta) {
            return from.substr(0, Math.round(from.length * (1 - delta))) + to.substr(Math.round(to.length * (1 - delta)));
        }
    },

    prepare: function (key, value) {
        var parser = Ext.draw.fx.Parser.AttributeParser[key];
        // TODO: Use Ext.logger
        if (!parser && console && console.warn) {
            console.warn('Missing parser for property ' + key + '. Using String parser.');
        }
        return parser ? parser.parse(value) : value;
    }
}, function () {
    var parser = Ext.draw.fx.Parser;

    //TODO(nico): Add more parsers here
    parser.AttributeParser = {
        strokeStyle: parser.Color,
        fillStyle: parser.Color,
        shadowColor: parser.Color,

        strokeOpacity: parser.Number,
        fillOpacity: parser.Number,
        lineWidth: parser.Number,
        globalAlpha: parser.Number,
        shadowOffsetX: parser.Number,
        shadowOffsetY: parser.Number,
        shadowBlur: parser.Number,
        lineJoin: parser.Number,
        translationX: parser.Number,
        translationY: parser.Number,
        scalingX: parser.Number,
        scalingY: parser.Number,
        scalingCenterX: parser.Number,
        scalingCenterY: parser.Number,
        rotationRad: parser.Number,
        rotationCenterX: parser.Number,
        rotationCenterY: parser.Number,
        x: parser.Number,
        y: parser.Number,
        width: parser.Number,
        height: parser.Number,
        top: parser.Number,
        left: parser.Number,
        bottom: parser.Number,
        right: parser.Number,
        margin: parser.Number,
        degrees: parser.Number,
        radius: parser.Number,
        r: parser.Number,
        size: parser.Number,
        fontSize: parser.Number,
        fontFamily: parser.String,
        startAngle: parser.Number,
        endAngle: parser.Number,
        centerX: parser.Number,
        centerY: parser.Number,
        rho: parser.Number,
        startRho: parser.Number,
        endRho: parser.Number,
        handlerOpacity: parser.Number,

        path: parser.Path,

        dataX: parser.Data,
        dataY: parser.Data,
        dataRange: parser.Data,
        coeff: parser.Data,

        zIndex: parser.String,
        index: parser.String,
        type: parser.String,
        src: parser.String,
        reset: parser.String,
        font: parser.String,
        hidden: parser.String,
        text: parser.Text
    };
});
