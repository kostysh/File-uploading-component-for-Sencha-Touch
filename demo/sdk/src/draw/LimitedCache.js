/**
 * Limited cache.
 */
Ext.define("Ext.draw.LimitedCache", {
    config: {
        limit: 40,
        feeder: function () {
            return 0;
        },
        scope: null
    },
    cache: null,

    constructor: function (config) {
        this.cache = {};
        this.cache.list = [];
        this.cache.tail = 0;
        this.initConfig(config);
    },

    /**
     * Get a cached object.
     * @param {String} id
     * @param {Mixed...} args Arguments appended to feeder
     */
    get: function (id) {
        // TODO: Implement cache hit optimization
        var cache = this.cache,
            limit = this.getLimit(),
            feeder = this.getFeeder(),
            scope = this.getScope() || this;

        if (cache[id]) {
            return cache[id].value;
        }
        if (cache.list[cache.tail]) {
            delete cache[cache.list[cache.tail].cacheId];
        }
        cache[id] = cache.list[cache.tail] = {
            value: feeder.apply(scope, Array.prototype.slice.call(arguments, 1)),
            cacheId: id
        };
        cache.tail++;
        if (cache.tail === limit) {
            cache.tail = 0;
        }
        return cache[id].value;
    },

    clear: function () {
        this.cache = {};
        this.cache.list = [];
        this.cache.tail = 0;
    }
});