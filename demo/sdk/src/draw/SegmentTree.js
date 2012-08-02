/**
 * Return the aggregation
 */
Ext.define("Ext.draw.SegmentTree", {

    config: {
        strategy: "none"
    },

    "time": function (result, endPosition, dataX, dataOpen, dataHigh, dataLow, dataClose) {
        var startPosition = 0, lastOffset, lastOffsetEnd,
            minimum = new Date(dataX[result[0].startIdx]),
            maximum = new Date(dataX[result[endPosition - 1].endIdx]),
            ExtDate = Ext.Date,
            units = [
                [ExtDate.MILLI, 1, 'ms1', null],
                [ExtDate.MILLI, 2, 'ms2', 'ms1'],
                [ExtDate.MILLI, 5, 'ms5', 'ms1'],
                [ExtDate.MILLI, 10, 'ms10', 'ms5'],
                [ExtDate.MILLI, 50, 'ms50', 'ms10'],
                [ExtDate.MILLI, 100, 'ms100', 'ms50'],
                [ExtDate.MILLI, 500, 'ms500', 'ms100'],
                [ExtDate.SECOND, 1, 's1', 'ms500'],
                [ExtDate.SECOND, 10, 's10', 's1'],
                [ExtDate.SECOND, 30, 's30', 's10'],
                [ExtDate.MINUTE, 1, 'mi1', 's10'],
                [ExtDate.MINUTE, 5, 'mi5', 'mi1'],
                [ExtDate.MINUTE, 10, 'mi10', 'mi5'],
                [ExtDate.MINUTE, 30, 'mi30', 'mi10'],
                [ExtDate.HOUR, 1, 'h1', 'mi30'],
                [ExtDate.HOUR, 6, 'h6', 'h1'],
                [ExtDate.HOUR, 12, 'h12', 'h6'],
                [ExtDate.DAY, 1, 'd1', 'h12'],
                [ExtDate.DAY, 7, 'd7', 'd1'],
                [ExtDate.MONTH, 1, 'mo1', 'd1'],
                [ExtDate.MONTH, 3, 'mo3', 'mo1'],
                [ExtDate.MONTH, 6, 'mo6', 'mo3'],
                [ExtDate.YEAR, 1, 'y1', 'mo3'],
                [ExtDate.YEAR, 5, 'y5', 'y1'],
                [ExtDate.YEAR, 10, 'y10', 'y5'],
                [ExtDate.YEAR, 100, 'y100', 'y10']
            ], unitIdx, currentUnit,
            plainStart = startPosition,
            plainEnd = endPosition,
            source, i, current, item = [];

        for (unitIdx = 0; endPosition > startPosition + 1 && unitIdx < units.length; unitIdx++) {
            minimum = new Date(dataX[result[0].startIdx]);
            currentUnit = units[unitIdx];
            minimum = Ext.Date.align(minimum, currentUnit[0], currentUnit[1]);
            if (Ext.Date.diff(minimum, maximum, currentUnit[0]) > dataX.length * 2 * currentUnit[1]) {
                continue;
            }
            if (currentUnit[3] && result.map['time_' + currentUnit[3]]) {
                lastOffset = result.map['time_' + currentUnit[3]][0];
                lastOffsetEnd = result.map['time_' + currentUnit[3]][1];
            } else {
                lastOffset = plainStart;
                lastOffsetEnd = plainEnd;
            }

            startPosition = endPosition;
            current = minimum;
            item = null;
            for (i = lastOffset; i < lastOffsetEnd; i++) {
                source = result[i];
                if (item && dataX[source.endIdx] < +current) {
                    item.endIdx = source.endIdx;
                    item.close = source.close;
                    if (source.maxY > item.maxY) {
                        item.maxY = source.maxY;
                        item.maxX = source.maxX;
                        item.maxIdx = source.maxIdx;
                    }
                    if (source.minY < item.minY) {
                        item.minY = source.minY;
                        item.minX = source.minX;
                        item.minIdx = source.minIdx;
                    }
                } else {
                    item = {
                        startIdx: source.startIdx,
                        endIdx: source.endIdx,
                        minIdx: source.minIdx,
                        maxIdx: source.maxIdx,
                        open: source.open,
                        close: source.close,
                        minX: source.minX,
                        minY: source.minY,
                        maxX: source.maxX,
                        maxY: source.maxY
                    };
                    result[endPosition++] = item;
                    current = Ext.Date.add(current, currentUnit[0], currentUnit[1]);
                }
            }
            if (endPosition > startPosition) {
                result.map['time_' + currentUnit[2]] = [startPosition, endPosition];
            }
        }
    },

    "10x": function (result, position, dataX, dataOpen, dataHigh, dataLow, dataClose) {
        var offset = 0, lastOffset,
            minimum = dataX[result[0].startIdx],
            maximum = dataX[result[position - 1].endIdx],
            estDist = Math.pow(10, Math.floor(1 + Math.log((maximum - minimum) / position) * Math.LOG10E)),
            source, i, current, item = [];
        minimum = Math.floor(minimum / estDist) * estDist;
        while (position > offset + 1) {
            lastOffset = offset;
            offset = position;
            source = result[lastOffset];
            current = minimum;
            for (i = lastOffset; i < offset; i++) {
                source = result[i];
                if (dataX[source.endIdx] < current) {
                    item.endIdx = source.endIdx;
                    item.close = source.close;
                    if (source.maxY > item.maxY) {
                        item.maxX = source.maxX;
                        item.maxY = source.maxY;
                        item.maxIdx = source.maxIdx;
                    }
                    if (source.minY < item.minY) {
                        item.minX = source.minX;
                        item.minY = source.minY;
                        item.minIdx = source.minIdx;
                    }
                } else {
                    item = {
                        startIdx: source.startIdx,
                        endIdx: source.endIdx,
                        minIdx: source.minIdx,
                        maxIdx: source.maxIdx,
                        open: source.open,
                        close: source.close,
                        minX: source.minX,
                        minY: source.minY,
                        maxX: source.maxX,
                        maxY: source.maxY
                    };
                    result[position++] = item;
                    current += estDist;
                }
            }
            estDist *= 10;
            result.map['10x_' + estDist] = [offset, position];
        }
    },

    "double": function (result, position, dataX, dataOpen, dataHigh, dataLow, dataClose) {
        var offset = 0, lastOffset, step = 1,
            r1, r2, i, item = [];
        while (position > offset + 1) {
            lastOffset = offset;
            offset = position;
            step += step;
            for (i = lastOffset; i < offset; i += 2) {
                r1 = result[i];
                if (i == offset - 1) {
                    item = {
                        startIdx: r1.startIdx,
                        endIdx: r1.endIdx,
                        minIdx: r1.minIdx,
                        maxIdx: r1.maxIdx,
                        open: r1.open,
                        close: r1.close,
                        minX: r1.minX,
                        minY: r1.minY,
                        maxX: r1.maxX,
                        maxY: r1.maxY
                    }
                } else {
                    r2 = result[i + 1];
                    item = {};
                    item.startIdx = r1.startIdx;
                    item.endIdx = r2.endIdx;
                    item.open = r1.open;
                    item.close = r1.close;
                    if (r1.minY <= r2.minY) {
                        item.minIdx = r1.minIdx;
                        item.minX = r1.minX;
                        item.minY = r1.minY;
                    } else {
                        item.minIdx = r2.minIdx;
                        item.minX = r2.minX;
                        item.minY = r2.minY;
                    }
                    if (r1.maxY >= r2.maxY) {
                        item.maxIdx = r1.maxIdx;
                        item.maxX = r1.maxX;
                        item.maxY = r1.maxY;
                    } else {
                        item.maxIdx = r2.maxIdx;
                        item.maxX = r2.maxX;
                        item.maxY = r2.maxY;
                    }
                }
                result[position++] = item;
            }
            result.map['double_' + step] = [offset, position];
        }
    },

    "none": Ext.emptyFn,

    aggregateData: function (dataX, dataOpen, dataHigh, dataLow, dataClose) {
        var length = dataX.length,
            result = [],
            i;
        for (i = 0; i < length; i++) {
            result[i] = {
                startIdx: i,
                endIdx: i,
                minIdx: i,
                maxIdx: i,
                open: dataOpen[i],
                minX: dataX[i],
                minY: dataLow[i],
                maxX: dataX[i],
                maxY: dataHigh[i],
                close: dataClose[i]
            };
        }
        result.map = {
            original: [0, length]
        };
        if (result.length) {
            this[this.getStrategy()](result, length, dataX, dataOpen, dataHigh, dataLow, dataClose);
        }
        return result;
    },

    setData: function (dataX, dataOpen, dataHigh, dataLow, dataClose) {
        if (!dataHigh) {
            dataClose = dataLow = dataHigh = dataOpen;
        }
        this.dataX = dataX;
        this.dataOpen = dataOpen;
        this.dataHigh = dataHigh;
        this.dataLow = dataLow;
        this.dataClose = dataClose;
        if (dataX.length == dataHigh.length &&
            dataX.length == dataLow.length) {
            this.cache = this.aggregateData(dataX, dataOpen, dataHigh, dataLow, dataClose);
        }
    },

    constructor: function (config) {
        this.initConfig(config);
    },

    binarySearchMin: function (items, start, end, key) {
        var dx = this.dataX;
        if (key <= dx[items[0].startIdx]) {
            return start;
        }
        if (key >= dx[items[end - 1].startIdx]) {
            return end - 1;
        }
        while (start + 1 < end) {
            var mid = (start + end) >> 1,
                val = dx[items[mid].startIdx];
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

    binarySearchMax: function (items, start, end, key) {
        var dx = this.dataX;
        if (key <= dx[items[0].endIdx]) {
            return start;
        }
        if (key >= dx[items[end - 1].endIdx]) {
            return end - 1;
        }
        while (start + 1 < end) {
            var mid = (start + end) >> 1,
                val = dx[items[mid].endIdx];
            if (val == key) {
                return mid;
            } else if (val < key) {
                start = mid;
            } else {
                end = mid;
            }
        }
        return end;
    },

    getAggregation: function (min, max, estStep) {
        if (!this.cache) {
            return null;
        }
        var minStep = Infinity,
            range = this.dataX[this.dataX.length - 1] - this.dataX[0],
            cacheMap = this.cache.map,
            result = cacheMap.original,
            name, positions, ln, step, minIdx, maxIdx;

        for (name in cacheMap) {
            positions = cacheMap[name];
            ln = positions[1] - positions[0] - 1;
            step = range / ln;
            if (estStep <= step && step < minStep) {
                result = positions;
                minStep = step;
            }
        }
        minIdx = Math.max(this.binarySearchMin(this.cache, result[0], result[1], min), result[0]);
        maxIdx = Math.min(this.binarySearchMax(this.cache, result[0], result[1], max) + 1, result[1]);
        return {
            data: this.cache,
            start: minIdx,
            end: maxIdx
        };
    }
});