/**
 * Sampler.
 */
Ext.define("Ext.draw.Sampler", {
    minData: null,

    maxData: null,

    // minSamples[starts[i-1] + j] = minSamples[i][j] = [j * (1 << i), (j + 1) * (1 << i) - 1]
    minSamples: null,

    maxSamples: null,

    starts: null,

    constructor: function (minData, maxData, scales) {
        if (!(minData instanceof Float32Array)) {
            this.minData = minData = new Float32Array(minData);
        } else {
            this.minData = minData;
        }
        if (!maxData) {
            maxData = minData;
        }
        if (!(maxData instanceof Float32Array)) {
            this.maxData = maxData = new Float32Array(maxData);
        } else {
            this.maxData = maxData;
        }
        var length = minData.length,
            minSamples = this.minSamples = new Float32Array(length + 32),
            maxSamples = this.maxSamples = new Float32Array(length + 32),
            start = 0,
            starts = this.starts = [0],
            testMin, testMax, lastLength, lastStart, lastPosition, i, j;

        lastLength = length;
        length = (length + 1) >> 1;

        // 1st slicing.
        for (i = 0; i < length; i++) {
            lastPosition = i + i;
            testMin = testMax = minSamples[i] = maxSamples[i] = lastPosition;
            lastPosition++;
            if (lastPosition < lastLength) {
                if (minData[testMin] > minData[lastPosition]) {
                    minSamples[i] = lastPosition;
                }
                if (maxData[testMax] < maxData[lastPosition]) {
                    maxSamples[i] = lastPosition;
                }
            }
        }

        lastLength = length;
        length = (length + 1) >> 1;
        j = i;
        lastStart = 0;

        while (length >= 1) {
            lastStart = start;
            start = j;
            starts.push(j);
            for (i = 0; i < length; i++, j++) {
                lastPosition = lastStart + i + i;
                testMin = minSamples[j] = minSamples[lastPosition];
                testMax = maxSamples[j] = maxSamples[lastPosition];
                lastPosition++;
                if (lastPosition < lastStart + lastLength) {
                    if (minData[testMin] > minData[minSamples[lastPosition]]) {
                        minSamples[j] = minSamples[lastPosition];
                    }
                    if (maxData[testMax] < maxData[maxSamples[lastPosition]]) {
                        maxSamples[j] = maxSamples[lastPosition];
                    }
                }
            }
            lastLength = length;
            if (length == 1) {
                break;
            }
            length = (length + 1) >> 1;
        }
    },
    /**
     * @private
     * @param from
     * @param to from < to [from, to)
     * @param level
     */
    queryRange: function (from, to, level) {
        var minData = this.minData,
            maxData = this.maxData,
            minIdx, maxIdx, minMax,
            testMin, testMax;

        if (level == 0) {
            minIdx = from;
            maxIdx = from;
        } else {
            minIdx = this.minSamples[this.starts[level - 1] + from];
            maxIdx = this.maxSamples[this.starts[level - 1] + from];
        }
        if (((from + 1) >> 1) < (to >> 1)) {
            minMax = this.queryRange(((from + 1) >> 1), (to >> 1), level + 1);
            testMin = minMax.min;
            testMax = minMax.max;
            if (minData[minIdx] > minData[testMin]) {
                minIdx = testMin;
            }
            if (maxData[maxIdx] < maxData[testMax]) {
                maxIdx = testMax;
            }
        }
        if (to & 1) {
            if (level) {
                testMin = this.minSamples[this.starts[level - 1] + to - 1];
                testMax = this.maxSamples[this.starts[level - 1] + to - 1];
            } else {
                testMin = testMax = to - 1;
            }
            if (minData[minIdx] > minData[testMin]) {
                minIdx = testMin;
            }
            if (maxData[maxIdx] < maxData[testMax]) {
                maxIdx = testMax;
            }
        }
        return {
            min: minIdx,
            max: maxIdx
        }
    },

    queryIndex: function (from, to) {
        if (from > to) {
            return this.queryIndex(to, from);
        } else if (from == to) {
            return {min: from, max: from};
        } else {
            to++;
            var level = Math.ceil(Math.log(to - from) / Math.log(2));
            if (level > 0 && (from >> level << level) == from && (to >> level << level) == to) {
                if (from + (1 << level) == to) {
                    from = this.starts[level - 1] + (from >> level);
                    return {
                        min: this.minSamples[from],
                        max: this.maxSamples[from]
                    };
                }
                return this.queryRange(from >> level, to >> level, level);
            } else {
                return this.queryRange(from, to, 0);
            }
        }
    },

    query: function (from, to) {
        var idx = this.queryIndex(from, to);
        return {
            min: this.minData[idx.min],
            max: this.maxData[idx.max]
        }
    },

    destroy: function () {
        delete this.minData;
        delete this.maxData;
        delete this.minSamples;
        delete this.maxSamples;
    }
});