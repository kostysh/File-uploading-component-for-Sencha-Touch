(function (global) {
    if (!global.Float32Array) {
        // Typed Array polyfill
        function Float32Array(array) {
            if (typeof array == 'number') {
                this.length = array;
            } else if ('length' in array) {
                this.length = array.length;
                for (var i = 0, len = array.length; i < len; i++) {
                    this[i] = +array[i];
                }
            }
        }

        Float32Array.prototype = [];
        global.Float32Array = Float32Array;
    }
})(this);


/**
 * @singleton Ext.draw.Draw
 * Base Drawing class.  Provides base drawing functions.
 */

Ext.define('Ext.draw.Draw', {

    singleton: true,

    requires: ['Ext.env.OS', 'Ext.draw.Color', 'Ext.draw.fx.Frame', 'Ext.draw.Matrix', 'Ext.draw.Bezier'],
    stopsRE: /^(\d+%?)$/,
    pathRe: /,?([achlmqrstvxz]),?/gi,
    pathSplitRe: /\s|,/g,
    radian: Math.PI / 180,
    pi2: Math.PI * 2,
    snapEndsIntervalWeights: [
        [0, 15],
        [20, 4],
        [30, 2],
        [40, 4],
        [50, 9],
        [60, 4],
        [70, 2],
        [80, 4],
        [100, 15]
    ],

    is: function (o, type) {
        type = String(type).toLowerCase();
        return (type == "object" && o === Object(o)) ||
            (type == "undefined" && typeof o == type) ||
            (type == "null" && o === null) ||
            (type == "array" && Array.isArray && Array.isArray(o)) ||
            (Object.prototype.toString.call(o).toLowerCase().slice(8, -1)) == type;
    },

    cross3: function (a, b, c) {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    },

    /**
     * Ray-test of a convex hull.
     * @param pt {Array} point to test.
     * @param polygon {Array} right-hand convex hull.
     */
    pointInConvexHull: function (pt, polygon) {
        var cn = 0,
            x = pt[0],
            y = pt[1],
            from, to;

        for (var i = 0; i < polygon.length; i++) {
            from = polygon[i];
            to = polygon[i + 1] || polygon[0];
            if (from[1] === to[1]) {
                if (this.cross3(pt, from, to) <= 0) {
                    cn++;
                }
            } else if (from[1] < y && y <= to[1] ||
                to[1] <= y && y < from[1]) {
                if (x <= from[0] && x <= to[0]) {
                    cn++;
                } else if (x <= from[0] || x <= to[0]) {
                    if (this.cross3(pt, from, to) <= 0) {
                        cn++;
                    }
                }
            }
        }
        return cn % 2 === 1;
    },

    cropByHalfPlane: function (path, cross) {
        return path;
//        var i, ln, part, result = [], x, y, lastX, lastY,
//            lastInside, inside, r, lastStart, lastStartInside;
//        for (i = 0, ln = path.length; i < ln; i++) {
//            part = path[i];
//            switch (part[0]) {
//                case 'M':
//                    x = part[1];
//                    y = part[2];
//                    inside = cross(x, y);
//                    result.push(lastStart = part.slice(0));
//                    lastStartInside = inside;
//                    break;
//                case 'L':
//                    x = part[1];
//                    y = part[2];
//                    inside = cross(x, y);
//                    if (lastInside > 0) {
//                        if (inside <= 0) {
//                            r = inside / (inside - lastInside);
//                            result.push(['L', (lastX - x) * r + x, (lastY - y) * r + y]);
//                            result.push(part);
//                        }
//                    } else {
//                        if (inside <= 0) {
//                            result.push(part);
//                        } else {
//                            r = inside / (inside - lastInside);
//                            result.push(['L', (lastX - x) * r + x, (lastY - y) * r + y]);
//                        }
//                    }
//                    break;
//                case 'C':
//                    x = part[5];
//                    y = part[6];
//                    inside = cross(x, y);
//                    if (lastInside > 0) {
//                        if (cross(part[1], part[2]) <= 0 ||
//                            cross(part[3], part[4]) <= 0 ||
//                            inside <= 0) {
//                            result.push(['L', lastX, lastY]);
//                            result.push(part);
//                        }
//                    } else {
//                        result.push(part);
//                    }
//                    break;
//                case 'Z':
//                    x = lastStart[1];
//                    y = lastStart[2];
//                    inside = cross(x, y);
//                    if (lastInside > 0) {
//                        if (inside <= 0) {
//                            r = inside / (inside - lastInside);
//                            result.push(['L', (lastX - x) * r + x, (lastY - y) * r + y]);
//                            result.push(part.slice(0));
//                        }
//                    } else {
//                        if (inside <= 0) {
//                            result.push(part);
//                        } else {
//                            r = inside / (inside - lastInside);
//                            lastStart[1] = (lastX - x) * r + x;
//                            lastStart[2] = (lastY - y) * r + y;
//                            result.push(part);
//                        }
//                    }
//                    break;
//            }
//            lastInside = inside;
//            lastX = x;
//            lastY = y;
//        }
//        if (lastInside > 0) {
//            result.push(['L', lastX, lastY]);
//        }
//        result.isBSegs = true;
//        return result;
    },

    cropByRect: function (path, l, r, t, b) {
        var temp;

        if (l == r) {
            return [];
        } else if (l > r) {
            temp = r;
            r = l;
            l = temp;
        }
        if (t == b) {
            return [];
        } else if (t > b) {
            temp = t;
            t = b;
            b = temp;
        }
        path = this.cropByHalfPlane(path, function (x, y) { return x - r; });
        path = this.cropByHalfPlane(path, function (x, y) { return l - x; });
        path = this.cropByHalfPlane(path, function (x, y) { return y - b; });
        path = this.cropByHalfPlane(path, function (x, y) { return t - y; });
        return path;
    },

    cropByConvexHull: function (path, hull) {
        var area = 0,
            i, from, to, cross3;

        if (hull.length > 2) {
            for (i = 2; i < hull.length; i++) {
                area = this.cross3(hull[0], hull[i - 1], hull[i]);
            }
            if (area < 0) {
                hull = hull.slice(0);
                hull.reverse();
            }
        } else {
            return [];
        }
        for (i = 0; i < hull.length; i++) {
            from = hull[i];
            to = hull[i + 1] || hull[0];
            cross3 = this.cross3;
            path = this.cropByHalfPlane(path, function (x, y) { return cross3([x, y], to, from)});
        }
        path.isBSegs = true;
        return path;
    },

    mapViewport: function (from, to) {
        return new Ext.draw.Matrix(to[2] / from[2], 0, 0, to[3] / from[3], to[0] - from[0], to[1] - from[1]);
    },

    intersectInside: function (path, cp1, cp2) {
        return (cp2[0] - cp1[0]) * (path[1] - cp1[1]) > (cp2[1] - cp1[1]) * (path[0] - cp1[0]);
    },

    intersectIntersection: function (s, e, cp1, cp2) {
        var p = [],
            dcx = cp1[0] - cp2[0],
            dcy = cp1[1] - cp2[1],
            dpx = s[0] - e[0],
            dpy = s[1] - e[1],
            n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
            n2 = s[0] * e[1] - s[1] * e[0],
            n3 = 1 / (dcx * dpy - dcy * dpx);

        p[0] = (n1 * dpx - n2 * dcx) * n3;
        p[1] = (n1 * dpy - n2 * dcy) * n3;
        return p;
    },

    intersect: function (subjectPolygon, clipPolygon) {
        var me = this,
            i = 0,
            ln = clipPolygon.length,
            cp1 = clipPolygon[ln - 1],
            outputList = subjectPolygon,
            cp2, s, e, ln2, inputList, j;

        for (; i < ln; ++i) {
            cp2 = clipPolygon[i];
            inputList = outputList;
            outputList = [];
            s = inputList[inputList.length - 1];
            j = 0;
            ln2 = inputList.length;
            for (; j < ln2; j++) {
                e = inputList[j];
                if (me.intersectInside(e, cp1, cp2)) {
                    if (!me.intersectInside(s, cp1, cp2)) {
                        outputList.push(me.intersectIntersection(s, e, cp1, cp2));
                    }
                    outputList.push(e);
                }
                else if (me.intersectInside(s, cp1, cp2)) {
                    outputList.push(me.intersectIntersection(s, e, cp1, cp2));
                }
                s = e;
            }
            cp1 = cp2;
        }
        return outputList;
    },

    /**
     * @private
     *
     * Calculates bezier curve control anchor points for a particular point in a path, with a
     * smoothing curve applied. The smoothness of the curve is controlled by the 'value' parameter.
     * Note that this algorithm assumes that the line being smoothed is normalized going from left
     * to right; it makes special adjustments assuming this orientation.
     *
     * @param {Number} prevX X coordinate of the previous point in the path
     * @param {Number} prevY Y coordinate of the previous point in the path
     * @param {Number} curX X coordinate of the current point in the path
     * @param {Number} curY Y coordinate of the current point in the path
     * @param {Number} nextX X coordinate of the next point in the path
     * @param {Number} nextY Y coordinate of the next point in the path
     * @param {Number} value A value to control the smoothness of the curve; this is used to
     *                 divide the distance between points, so a value of 2 corresponds to
     *                 half the distance between points (a very smooth line) while higher values
     *                 result in less smooth curves. Defaults to 4.
     * @return {Object} Object containing x1, y1, x2, y2 bezier control anchor points; x1 and y1
     *                  are the control point for the curve toward the previous path point, and
     *                  x2 and y2 are the control point for the curve toward the next path point.
     */
    getAnchors: function (prevX, prevY, curX, curY, nextX, nextY, value) {
        value = value || 4;
        var math = Math,
            PI = math.PI,
            halfPI = PI / 2,
            abs = math.abs,
            sin = math.sin,
            cos = math.cos,
            atan = math.atan,
            control1Length, control2Length, control1Angle, control2Angle,
            control1X, control1Y, control2X, control2Y, alpha;

        // Find the length of each control anchor line, by dividing the horizontal distance
        // between points by the value parameter.
        control1Length = (curX - prevX) / value;
        control2Length = (nextX - curX) / value;

        // Determine the angle of each control anchor line. If the middle point is a vertical
        // turnaround then we force it to a flat horizontal angle to prevent the curve from
        // dipping above or below the middle point. Otherwise we use an angle that points
        // toward the previous/next target point.
        if ((curY >= prevY && curY >= nextY) || (curY <= prevY && curY <= nextY)) {
            control1Angle = control2Angle = halfPI;
        } else {
            control1Angle = atan((curX - prevX) / abs(curY - prevY));
            if (prevY < curY) {
                control1Angle = PI - control1Angle;
            }
            control2Angle = atan((nextX - curX) / abs(curY - nextY));
            if (nextY < curY) {
                control2Angle = PI - control2Angle;
            }
        }

        // Adjust the calculated angles so they point away from each other on the same line
        alpha = halfPI - ((control1Angle + control2Angle) % (PI * 2)) / 2;
        if (alpha > halfPI) {
            alpha -= PI;
        }
        control1Angle += alpha;
        control2Angle += alpha;

        // Find the control anchor points from the angles and length
        control1X = curX - control1Length * sin(control1Angle);
        control1Y = curY + control1Length * cos(control1Angle);
        control2X = curX + control2Length * sin(control2Angle);
        control2Y = curY + control2Length * cos(control2Angle);

        // One last adjustment, make sure that no control anchor point extends vertically past
        // its target prev/next point, as that results in curves dipping above or below and
        // bending back strangely. If we find this happening we keep the control angle but
        // reduce the length of the control line so it stays within bounds.
        if ((curY > prevY && control1Y < prevY) || (curY < prevY && control1Y > prevY)) {
            control1X += abs(prevY - control1Y) * (control1X - curX) / (control1Y - curY);
            control1Y = prevY;
        }
        if ((curY > nextY && control2Y < nextY) || (curY < nextY && control2Y > nextY)) {
            control2X -= abs(nextY - control2Y) * (control2X - curX) / (control2Y - curY);
            control2Y = nextY;
        }

        return {
            x1: control1X,
            y1: control1Y,
            x2: control2X,
            y2: control2Y
        };
    },

    /* Smoothing function for a path.  Converts a path into cubic beziers.  Value defines the divider of the distance between points.
     * Defaults to a value of 4.
     */
    smooth: function (originalPath, value) {
        var path = this.path2curve(originalPath),
            newp = [path[0]],
            x = path[0][1],
            y = path[0][2],
            i = 1,
            ii = path.length,
            beg = 1,
            mx = x,
            my = y,
            cx = 0,
            cy = 0,
            j, points, begl;

        for (; i < ii; i++) {
            var pathi = path[i],
                pathil = pathi.length,
                pathim = path[i - 1],
                pathiml = pathim.length,
                pathip = path[i + 1],
                pathipl = pathip && pathip.length;
            if (pathi[0] == "M") {
                mx = pathi[1];
                my = pathi[2];
                j = i + 1;
                while (path[j][0] != "C") {
                    j++;
                }
                cx = path[j][5];
                cy = path[j][6];
                newp.push(["M", mx, my]);
                beg = newp.length;
                x = mx;
                y = my;
                continue;
            }
            if (pathi[pathil - 2] == mx && pathi[pathil - 1] == my && (!pathip || pathip[0] == "M")) {
                begl = newp[beg].length;
                points = this.getAnchors(pathim[pathiml - 2], pathim[pathiml - 1], mx, my, newp[beg][begl - 2], newp[beg][begl - 1], value);
                newp[beg][1] = points.x2;
                newp[beg][2] = points.y2;
            }
            else if (!pathip || pathip[0] == "M") {
                points = {
                    x1: pathi[pathil - 2],
                    y1: pathi[pathil - 1]
                };
            } else {
                points = this.getAnchors(pathim[pathiml - 2], pathim[pathiml - 1], pathi[pathil - 2], pathi[pathil - 1], pathip[pathipl - 2], pathip[pathipl - 1], value);
            }
            newp.push(["C", x, y, points.x1, points.y1, pathi[pathil - 2], pathi[pathil - 1]]);
            x = points.x2;
            y = points.y2;
        }
        return newp;
    },

    findDotAtSegment: function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
        var t1 = 1 - t;
        return {
            x: Math.pow(t1, 3) * p1x + Math.pow(t1, 2) * 3 * t * c1x + t1 * 3 * t * t * c2x + Math.pow(t, 3) * p2x,
            y: Math.pow(t1, 3) * p1y + Math.pow(t1, 2) * 3 * t * c1y + t1 * 3 * t * t * c2y + Math.pow(t, 3) * p2y
        };
    },

    projectionR: function (x, y, x1, y1, x2, y2) {
        var dx = x2 - x1,
            dy = y2 - y1,
            dx0 = x1 - x,
            dy0 = y1 - y;

        if (dx == 0) {
            return Math.abs(x1 - x);
        } else if (dy == 0) {
            return Math.abs(y1 - y);
        } else {
            var rat = dx / dy, r = 1 / (rat * rat + 1),
                offX = (dx0 - dy0 * rat);
            return offX * offX * r;
        }
    },

    projection: function (x, y, x1, y1, x2, y2) {
        var dx = x2 - x1,
            dy = y2 - y1,
            dx0 = x1 - x,
            dy0 = y1 - y;

        if (dx == 0) {
            return [x1, y];
        } else if (dy == 0) {
            return [x, y1];
        } else {
            var rat = dx / dy, r = 1 / (rat * rat + 1),
                offX = (dx0 - dy0 * rat) * r;
            return [
                offX + x,
                -offX * rat + y
            ];
        }
    },

    distance: function (p1, p2) {
        var dx = p1[0] - p2[0],
            dy = p1[1] - p2[1];

        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * snapEnds is a utility function that gives you axis ticks information based on start, end
     * and preferred number of steps. It happens quite often that you have just a dataset and need to
     * build an axis. If you simply take min and max and divide delta to number of steps you could get
     * very ugly numbers. Lets say you have min = 0.532 and max = 0.823 and you want to draw axis
     * across 20 steps. Simple calculation like (max - min) / steps will give us: 0.014549(9), so
     * your axis will look like this:
     *
     *     0.532, 0.5465499, 0.5610998, 0.5756497, etc
     *
     * Not pretty at all. snapEnds will give different set of numbers for the same values:
     *
     *     0.5, 0.52, 0.54, 0.56, 0.58, 0.6, 0.62, ... 0.8, 0.82, 0.84
     *
     * It starts a bit earlier and ends a bit later and trying to find a step which will look nice.
     *
     * @param {Number} from The minimum value in the data
     * @param {Number} to The maximum value in the data
     * @param {Number} stepsMax The maximum number of ticks
     * @param {Boolean} endsLocked If true, the 'from' and 'to' parameters will be used as fixed end values
     *        and will not be adjusted
     * @return {Object} The calculated step and ends info; properties are:
     *     - from: The result start value, which may be lower than the original start value
     *     - to: The result end value, which may be higher than the original end value
     *     - power: The power of 10 used in the step calculation
     *     - step: The value size of each step
     *     - steps: The number of steps. NOTE: the steps may not divide the from/to range perfectly evenly;
     *              there may be a smaller distance between the last step and the end value than between prior
     *              steps, particularly when the `endsLocked` param is true. Therefore it is best to not use
     *              the `steps` result when finding the axis tick points, instead use the `step`, `to`, and
     *              `from` to find the correct point for each tick.
     */
    snapEnds: function (from, to, stepsMax, endsLocked) {
        if (Ext.isDate(from)) {
            return this.snapEndsByDate(from, to, stepsMax, endsLocked);
        }
        var math = Math,
            pow = math.pow,
            floor = math.floor,

        // start with a precise step size
            step = (to - from) / stepsMax,

        // power is a power of 10 of the step. For axis 1, 2, 3 or 10, 20, 30 or
        // 0.1, 0.2, 0.3 power will be 0, 1 and -1 respectively.
            power = floor(math.log(step) / math.LN10) + 1,
            tenToPower = pow(10, power),

        // modulo will translate rounded value of the step to the 0 - 100 range. We will need it later.
            modulo = math.round((step % tenToPower) * pow(10, 2 - power)),

        // interval is an array of value/weight pairs
            interval = Ext.draw.Draw.snapEndsIntervalWeights,
            ln = interval.length,
            stepCount = 0,
            topWeight = 1e9,
            cur, value, weight, i, topValue, stepCount2;

        // round the start value by the power, so e.g. 0.532 will become 0.5.
        if (!endsLocked) {
            from = floor(from / tenToPower) * tenToPower;
        }
        cur = from;

        // find what is our step going to be to be closer to "pretty" numbers. This is done taking into
        // account the interval weights. This way we figure out topValue.
        for (i = 0; i < ln; i++) {
            value = interval[i][0];
            weight = (value - modulo) < 0 ? 1e6 : (value - modulo) / interval[i][1];
            if (weight < topWeight) {
                topValue = value;
                topWeight = weight;
            }
        }

        // with the new topValue, calculate the final step size
        step = floor(step * pow(10, -power)) * pow(10, power) + topValue * pow(10, power - 2);
        stepCount2 = Math.ceil((to - cur) / step);
        stepCount += stepCount2;
        cur += stepCount2 * step;

        // Cut everything that is after tenth digit after floating point. This is to get rid of
        // rounding errors, i.e. 12.00000000000121212.
        if (!endsLocked) {
            to = +cur.toFixed(10);
        }

        return {
            from: from,
            to: to,
            power: power,
            step: step,
            steps: stepCount
        };
    },

    /**
     * snapEndsByDate is a utility method to deduce an appropriate tick configuration for the data set of given
     * feature. Refer to {@link #snapEnds}.
     *
     * @param {Date} from The minimum value in the data
     * @param {Date} to The maximum value in the data
     * @param {Number} stepsMax The maximum number of ticks
     * @param {Boolean} lockEnds If true, the 'from' and 'to' parameters will be used as fixed end values
     *        and will not be adjusted
     * @return {Object} The calculated step and ends info; properties are:
     *     - from: The result start value, which may be lower than the original start value
     *     - to: The result end value, which may be higher than the original end value
     *     - step: The value size of each step
     *     - steps: The number of steps. NOTE: the steps may not divide the from/to range perfectly evenly;
     *              there may be a smaller distance between the last step and the end value than between prior
     *              steps, particularly when the `endsLocked` param is true. Therefore it is best to not use
     *              the `steps` result when finding the axis tick points, instead use the `step`, `to`, and
     *              `from` to find the correct point for each tick.
     */
    snapEndsByDate: function (from, to, stepsMax, lockEnds) {
        var selectedStep = false,
            scales = [
                [Ext.Date.MILLI, [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500]],
                [Ext.Date.SECOND, [1, 2, 3, 5, 10, 15, 30]],
                [Ext.Date.MINUTE, [1, 2, 3, 5, 10, 20, 30]],
                [Ext.Date.HOUR, [1, 2, 3, 4, 6, 12]],
                [Ext.Date.DAY, [1, 2, 3, 7, 14]],
                [Ext.Date.MONTH, [1, 2, 3, 4, 6]]
            ],
            ln = scales.length,
            i, j, scale, scale1Ln, yearDiff;

        // Find the most desirable scale
        for (i = 0; i < ln; i++) {
            scale = scales[i];
            scale1Ln = scale[1].length;
            for (j = 0; j < scale1Ln; j++) {
                if (to < Ext.Date.add(from, scale[0], scale[1][j] * stepsMax)) {
                    selectedStep = [scale[0], scale[1][j]];
                    return false;
                }
            }
        }

        if (!selectedStep) {
            yearDiff = this.snapEnds(from.getFullYear(), to.getFullYear() + 1, stepsMax, lockEnds);
            selectedStep = [Ext.Date.YEAR, Math.round(yearDiff.step)];
        }
        return this.snapEndsByDateAndStep(from, to, selectedStep, lockEnds);
    },

    /**
     * snapEndsByDateAndStep is a utility method to deduce an appropriate tick configuration for the data set of given
     * feature and specific step size.
     * @param {Date} from The minimum value in the data
     * @param {Date} to The maximum value in the data
     * @param {Array} step An array with two components: The first is the unit of the step (day, month, year, etc). The second one is the number of units for the step (1, 2, etc.).
     * @param {Boolean} lockEnds If true, the 'from' and 'to' parameters will be used as fixed end values
     *        and will not be adjusted
     */
    snapEndsByDateAndStep: function (from, to, step, lockEnds) {
        var fromStat = [from.getFullYear(), from.getMonth(), from.getDate(), from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds()],
            steps = 0,
            testFrom, testTo, minSteps, maxSteps, midSteps;

        if (lockEnds) {
            testFrom = from;
        } else {
            switch (step[0]) {
                case Ext.Date.MILLI:
                    testFrom = new Date(fromStat[0], fromStat[1], fromStat[2], fromStat[3],
                        fromStat[4], fromStat[5], Math.floor(fromStat[6] / step[1]) * step[1]);
                    break;
                case Ext.Date.SECOND:
                    testFrom = new Date(fromStat[0], fromStat[1], fromStat[2], fromStat[3],
                        fromStat[4], Math.floor(fromStat[5] / step[1]) * step[1], 0);
                    break;
                case Ext.Date.MINUTE:
                    testFrom = new Date(fromStat[0], fromStat[1], fromStat[2], fromStat[3],
                        Math.floor(fromStat[4] / step[1]) * step[1], 0, 0);
                    break;
                case Ext.Date.HOUR:
                    testFrom = new Date(fromStat[0], fromStat[1], fromStat[2],
                        Math.floor(fromStat[3] / step[1]) * step[1], 0, 0, 0);
                    break;
                case Ext.Date.DAY:
                    testFrom = new Date(fromStat[0], fromStat[1],
                        Math.floor((fromStat[2] - 1) / step[1]) * step[1] + 1, 0, 0, 0, 0);
                    break;
                case Ext.Date.MONTH:
                    testFrom = new Date(fromStat[0], Math.floor(fromStat[1] / step[1]) * step[1], 1, 0, 0, 0, 0);
                    break;
                default: // Ext.Date.YEAR
                    testFrom = new Date(Math.floor(fromStat[0] / step[1]) * step[1], 0, 1, 0, 0, 0, 0);
                    break;
            }
        }

        testTo = testFrom;

        if (lockEnds) {
            testTo = to;
        } else {
            steps = step[1];
            minSteps = 1;
            maxSteps = 1;
            while (+Ext.Date.add(testTo, step[0], steps * maxSteps) < +to) { // stop when testTo >= to
                maxSteps += maxSteps;
            }
            while (minSteps + 1 < maxSteps) {
                midSteps = Math.floor((minSteps + maxSteps) * 0.5);
                if (+Ext.Date.add(testTo, step[0], steps * midSteps) <= +to) {
                    minSteps = midSteps;
                } else {
                    maxSteps = midSteps;
                }
            }
            while (Ext.Date.add(testTo, step[0], steps * minSteps) < to) {
                minSteps++;
            }
            testTo = Ext.Date.add(testTo, step[0], steps * minSteps);
            steps *= minSteps;
        }
        return {
            from: +testFrom,
            to: +testTo,
            step: (testTo - testFrom) / steps,
            steps: steps
        };
    },

    sorter: function (a, b) {
        return a.offset - b.offset;
    },

    rad: function (degrees) {
        return degrees % 360 * Math.PI / 180;
    },

    degrees: function (radian) {
        return radian * 180 / Math.PI % 360;
    },

    withinBox: function (x, y, bbox) {
        bbox = bbox || {};
        return (x >= bbox.x && x <= (bbox.x + bbox.width) && y >= bbox.y && y <= (bbox.y + bbox.height));
    },

    isBBoxIntersect: function (bbox1, bbox2) {
        return (Math.max(bbox1.x, bbox2.x) > Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width)) ||
            (Math.max(bbox1.y, bbox2.y) > Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height));
    },

    updateIOS: Ext.os.is.iOS ? function () {
        // Work around for iOS
        // Nested 3d-transforms seems to block the changes inside it until some event is fire of change of dom tree.
        Ext.getBody().createChild({id: 'frame-workaround', style: 'position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px; background: rgba(0,0,0,0.001); z-index: 100000'});
        Ext.draw.fx.Frame.requestAnimationFrame(function () {Ext.get('frame-workaround').destroy();});
    } : Ext.emptyFn,

    binarySearch: function (sorted, key) {
        var start = 0, end = sorted.length; // [)
        if (key < sorted[0]) {
            return 0;
        }
        if (key > sorted[end - 1]) {
            return end - 1;
        }
        while (start + 1 < end) {
            var mid = (start + end) >> 1,
                val = sorted[mid];
            if (val == key) {
                return mid;
            } else if (val < key) {
                start = mid;
            } else {
                end = mid;
            }
        }
        return start;
    },

    parseGradient: function (gradient) {
        var me = this,
            type = gradient.type || 'linear',
            angle = gradient.angle || 0,
            degrees = gradient.degrees || 0,
            radian = me.radian,
            stops = gradient.stops,
            stopsArr = [],
            stop, vector, max, stopObj;

        if (type == 'linear') {
            vector = [0, 0, Math.cos(angle * radian), Math.sin(angle * radian)];
            max = 1 / (Math.max(Math.abs(vector[2]), Math.abs(vector[3])) || 1);
            vector[2] *= max;
            vector[3] *= max;
            if (vector[2] < 0) {
                vector[0] = -vector[2];
                vector[2] = 0;
            }
            if (vector[3] < 0) {
                vector[1] = -vector[3];
                vector[3] = 0;
            }
        }

        for (stop in stops) {
            if (stops.hasOwnProperty(stop) && me.stopsRE.test(stop)) {
                stopObj = {
                    offset: parseInt(stop, 10),
                    color: Ext.draw.Color.toHex(stops[stop].color) || '#ffffff',
                    opacity: stops[stop].opacity || 1
                };
                stopsArr.push(stopObj);
            }
        }
        // Sort by pct property
        stopsArr.sort(me.sorter);
        if (type == 'linear') {
            return {
                id: gradient.id,
                type: type,
                angle: angle,
                degrees: degrees,
                vector: vector,
                stops: stopsArr
            };
        }
        else {
            return {
                id: gradient.id,
                type: type,
                angle: angle,
                degrees: degrees,
                centerX: gradient.centerX,
                centerY: gradient.centerY,
                focalX: gradient.focalX,
                focalY: gradient.focalY,
                radius: gradient.radius,
                vector: vector,
                stops: stopsArr
            };
        }
    }
});
