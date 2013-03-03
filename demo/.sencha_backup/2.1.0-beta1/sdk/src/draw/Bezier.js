/**
 * A cubic equation solver for bezier curve.
 * @author ZHANG Bei <zhang.bei@extjs.com>
 * @class Ext.draw.Bezier
 * @singleton
 */


Ext.define("Ext.draw.Bezier", {

    singleton: true,

    intersectRanges: function (ranges1, ranges2) {
        var result = [],
            mmax = Math.max,
            mmin = Math.min,
            r1, r2, r, i, j;

        for (i = 0; i < ranges1.length; i++) {
            r1 = ranges1[i];
            for (j = 0; j < ranges2.length; j++) {
                r2 = ranges2[j];
                r = [mmax(r1[0], r2[0]), mmin(r1[1], r2[1])];
                if (!r[0] < r[1]) {
                    continue;
                }
                result.push(r);
            }
        }
        return result;
    },
    /**
     * @private
     * Math.pow does not allow the first argument to be
     * negative even if the second argument is an odd integer.
     * @param r
     */
    cubeRoot: function (r) {
        if (r > 0) {
            return Math.pow(r, 0.3333333333333333 /* 1/3 */);
        } else {
            return -Math.pow(-r, 0.3333333333333333 /* 1/3 */);
        }
    },
    /**
     * Create a function f(y) to resolve x^3+bx^2+cx+d0=y
     * @param {Number} a
     * @param {Number} b
     * @param {Number} c
     * @param {Number} d0
     * @return {function(Number):Array} f that f(y) is the array of roots.
     */
    cubicSolver: function (a, b, c, d0) {
        b = b / a;
        c = c / a;
        d0 = d0 / a;

        var b_3 = b * 0.3333333333333333 /* 1/3 */,
            b_33 = b_3 * b_3 * b_3,
            Q = b_3 * b_3 - c * 0.3333333333333333 /* 1/3 */,
            Q_2 = Math.sqrt(Q) * 2,
            Q3 = Q * Q * Q,
            Q3_2 = Math.sqrt(Q3),
            R0 = (b_3 * c - d0) * 0.5 - b_33,
            cubeRoot = this.cubeRoot;

        if (Math.abs(Q) < 1e-6) {
            return function (y) {
                var R = R0 + y / a / 2;
                return [cubeRoot(2 * R) - b_3];
            }
        } else if (Q < 0) {
            // Delta > 0
            return function (y) {
                var R = R0 + y / a * 0.5,
                    delta = R * R - Q3;
                return [cubeRoot(R + Math.sqrt(delta)) + cubeRoot(R - Math.sqrt(delta)) - b_3];
            }
        }
        return function (y) {
            var R = R0 + y / a * 0.5,
                delta = R * R - Q3;
            if (Math.abs(delta) < 1e-6) {
                return [Q_2 - b_3, -Q_2 * 0.5 - b_3, -Q_2 * 0.5 - b_3];
            } else if (delta > 0) {
                delta = Math.sqrt(delta);
                return [cubeRoot(R + delta) + cubeRoot(R - delta) - b_3];
            } else {
                var th = Math.acos(R / Q3_2) * 0.3333333333333333 /* 1/3 */;
                return [
                    Q_2 * Math.cos(th) - b_3,
                    Q_2 * Math.cos(th + 2.0943951023931953 /*Pi*2/3*/) - b_3,
                    Q_2 * Math.cos(th - 2.0943951023931953 /*Pi*2/3*/) - b_3];
            }
        }
    },
    createBezier: function (a, b, c, d) {
        var c3 = -a + 3 * b - 3 * c + d,
            c3_3 = c3 * 3,
            c2 = 3 * a - 6 * b + 3 * c,
            c2_2 = c2 + c2,
            c1 = -3 * a + 3 * b,
            c0 = a,
            intersectRanges = Ext.draw.Bezier.intersectRanges,
            mabs = Math.abs,
            solve, solveRange;

        function f(t) {
            return c0 + t * (c1 + t * (c2 + t * c3));
        }

        function sub(t) {
            return c1 + t * (c2_2 + t * c3_3);
        }

        function subDivide(t) {
            var a1 = (b - a) * t + a,
                a2 = (c - b) * t + b,
                a3 = (d - c) * t + c,
                b1 = (a2 - a1) * t + a1,
                b2 = (a3 - a2) * t + a2,
                c = (b2 - b1) * t + b1;
            return [
                [a, a1, b1, c],
                [c, b2, a3, b]
            ];
        }

        if (mabs(c3) < 1e-6) {
            if (mabs(c2) < 1e-6) {
                if (mabs(c1) < 1e-6) {
                    solve = function (y) {
                        return [];
                    }
                } else {
                    solve = function (y) {
                        return [(y - c0) / c1];
                    }
                }
            } else {
                solve = function (y) {
                    var delta = c1 * c1 - 4 * c2 * (c0 - y);
                    if (Math.abs(delta) < 1e-6) {
                        return [-0.5 * c1 / c2, -0.5 * c1 / c2]; // Matters to be 2 roots on ray test.
                    } else if (delta > 0) { // comp.gz... but already !ez
                        delta = Math.Math.sqrt(delta);
                        return [(-0.5 * c1 - delta) / c2, (-0.5 * c1 + delta) / c2];
                    }
                }
            }
        } else {
            solve = Ext.draw.Bezier.cubicSolver(c3, c2, c1, c0);
            solveRange = function (min, max) {
                if (min < max) {
                    var temp = max;
                    max = min;
                    min = temp;
                }
                var tmin = solve(min),
                    tmax = solve(max),
                    rangesMin = [],
                    rangesMax = [];

                if (tmin.length === 1) {
                    if (c3 > 0) {
                        rangesMin = [
                            [tmin[0], Infinity]
                        ];
                    } else {
                        rangesMin = [
                            [-Infinity, tmin[0]]
                        ];
                    }
                } else {
                    rangesMin = [tmin[0], tmin[1], tmin[2]];
                    rangesMin.sort();
                    if (c3 > 0) {
                        rangesMin = [
                            [rangesMin[0], rangesMin[1]],
                            [rangesMin[2], Infinity]
                        ];
                    } else {
                        rangesMin = [
                            [-Infinity, rangesMin[0]],
                            [rangesMin[1], rangesMin[2]]
                        ];
                    }
                }
                rangesMin = intersectRanges([ [0, 1] ], rangesMin);

                if (tmax.length === 1) {
                    if (c3 < 0) {
                        rangesMax = [
                            [tmax[0], Infinity]
                        ];
                    } else {
                        rangesMax = [
                            [-Infinity, tmax[0]]
                        ];
                    }
                } else {
                    rangesMax = [tmax[0], tmax[1], tmax[2]];
                    rangesMax.sort();
                    if (c3 < 0) {
                        rangesMax = [
                            [rangesMax[0], rangesMax[1]],
                            [rangesMax[2], Infinity]
                        ];
                    } else {
                        rangesMax = [
                            [-Infinity, rangesMax[0]],
                            [rangesMax[1], rangesMax[2]]
                        ];
                    }
                }
                return intersectRanges(rangesMin, rangesMax);
            }
        }

        f.solve = solve;
        f.solveRange = solveRange;

        f.combine = function (b2) {
            return Ext.draw.Bezier.createBezierFromSamples(a, f(2 / 3), b2(1 / 3), b2.d);
        };
        f.sub = sub;
        f.a = a;
        f.b = b;
        f.c = c;
        f.d = d;
        f.coeff = [c0, c1, c2, c3];
        return f;
    },

    createBezierFromCubicPolynomial: function (a, b, c, d) {
        return Ext.draw.Bezier.createBezier(d, d + c / 3, d + c / 3 * 2 + b / 3, a + b + c + d);
    },

    createBezierFromSamples: function (p0, p1, p2, p3) {
        return Ext.draw.Bezier.createBezier(p0, -((34 * p0) / 45) + (32 * p1) / 9 - (32 * p2) / 15 + p3 / 3, p0 / 3 - (32 * p1) / 15 + (32 * p2) / 9 -
            (34 * p3) / 45, p3);
    },

    createBezier2D: function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
        var xb = Ext.draw.Bezier.createBezier(p1x, c1x, c2x, p2x),
            yb = Ext.draw.Bezier.createBezier(p1y, c1y, c2y, p2y);

        function hitTest(x, y, radius) {
            if ((p1x - x) * (p1x - x) + (p1y - y) * (p1y - y) < radius * radius) {
                return true;
            }
            if ((p2x - x) * (p2x - x) + (p2y - y) * (p2y - y) < radius * radius) {
                return true;
            }
            var t = xb.solve(x), i;

            for (i = 0; i < t.length; i++) {
                if (0 <= t[i] && t[i] < 1) {
                    if (Math.abs(yb(t[i]) - y) < radius) {
                        return true;
                    }
                }
            }
            t = yb.solve(y);
            for (i = 0; i < t.length; i++) {
                if (0 <= t[i] && t[i] < 1) {
                    if (Math.abs(xb(t[i]) - x) < radius) {
                        return true;
                    }
                }
            }
            return false;
        }

        function rayTest(x, y) {
            var t = yb.solve(y), cnt = 0;
            for (var i = 0; i < t.length; i++) {
                if (0 <= t[i] && t[i] < 1) {
                    if (x < xb(t[i])) {
                        cnt++;
                    }
                }
            }
            return cnt;
        }

        function sub(t) {
            var x = xb.sub(t), y = yb.sub(t);
            return [
                [x[0][0], y[0][0], x[0][1], y[0][1], x[0][2], y[0][2], x[0][3], y[0][3]],
                [x[1][0], y[1][0], x[1][1], y[1][1], x[1][2], y[1][2], x[1][3], y[1][3]]
            ];
        }

        function f(t) {
            return [xb(t), yb(t)];
        }

        function combine(b2) {
            var nxb = this.xb.combine(b2.xb),
                nyb = this.yb.combine(b2.yb);

            return Ext.draw.Bezier.createBezier2D(nxb.a, nyb.a, nxb.b, nyb.b, nxb.c, nyb.c, nxb.d, nyb.d);
        }

        function diffCombined(a, b) {
            var max = 0, N = 50, i, x0, y0, y1, x1, dist;

            for (i = 0; i < N; i++) {
                x0 = xb(i / N / 2);
                y0 = yb(i / N / 2);
                x1 = a.xb(i / N);
                y1 = a.yb(i / N);
                dist = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
                if (dist > max) {
                    max = dist;
                }
            }

            for (i = 0; i < N; i++) {
                x0 = xb(i / N / 2 + 0.5);
                y0 = yb(i / N / 2 + 0.5);
                x1 = b.xb(i / N);
                y1 = b.yb(i / N);
                dist = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
                if (dist > max) {
                    max = dist;
                }
            }

            return max;
        }

        function crossTest(l, r, t, b) {
            return intersectRanges(xb.solveRange(l, r), yb.solveRange(t, b)).length > 0;
        }

        f.hitTest = hitTest;
        f.combine = combine;
        f.diffCombined = diffCombined;
        f.area = (3 * c2y * (p1x - 2 * p2x) -
            3 * c1y * (c2x - 2 * p1x + p2x) -
            p1y * (3 * c2x + 10 * p1x + p2x) +
            (6 * c2x + p1x + 10 * p2x) * p2y +
            3 * c1x * (c2y - 2 * p1y + p2y)) / 20;
        f.rayTest = rayTest;
        f.xb = xb;
        f.yb = yb;
        return f;
    },

    simplifyBeziers: function (beziers, threshHold) {
        if (!threshHold) {
            threshHold = 1;
        }
        var areas = [],
            ln = beziers.length,
            i, bezier, previousBezier, minimum, minimumI, minimumCombined, diff, combined;

        for (i = 0; i < ln; i++) {
            areas[i] = beziers[i].area;
        }
        do {
            minimum = Infinity;
            for (i = 1; i < beziers.length; i++) {
                bezier = beziers[i];
                previousBezier = beziers[i - 1];
                combined = previousBezier.combine(bezier);
                diff = combined.diffCombined(previousBezier, bezier);
                if (diff < minimum) {
                    minimum = diff;
                    minimumI = i;
                    minimumCombined = combined;
                    if (diff == 0) {
                        break;
                    }
                }
            }
            if (minimum > threshHold) {
                break;
            }
            beziers.splice(minimumI - 1, 2, minimumCombined);
            areas.splice(minimumI - 1, 2, areas[minimumI - 1] + areas[minimumI]);
        } while (beziers.length > 1);
        return beziers;
    }
});
