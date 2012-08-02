/**
 * Infinite dataview.
 */
Ext.define('Ext.dataview.component.Infinite', {
    extend: 'Ext.Container',

    mixins: ['Ext.mixin.Bindable'],

    requires: [
        'Ext.util.TranslatableGroup'
    ],

    config: {
        /**
         * @cfg layout
         * @accessor
         * @private
         */

        baseCls: 'x-infinite-list',

        /**
         * @cfg {String} direction
         * The direction of the List, either 'horizontal' or 'vertical'.
         * @accessor
         */
        direction: 'vertical',

        itemConfig: {},

        itemLength: null,

        scrollable: {
            scroller: {
                size: Infinity,
                autoRefresh: false,
                translatable: {
                    xclass: 'Ext.util.TranslatableGroup'
                }
            },
            indicators: false
        }
    },

    topItemIndex: 0,

    beforeInitialize: function(config) {
        var scrollable = config.scrollable;

        this.listItems = [];

        this.on({
            painted: 'refresh',
            resize: 'refresh'
        });

        if (scrollable) {
            if (!Ext.isObject(scrollable)) {
                scrollable = {};
            }

            Ext.merge(scrollable, {
                scroller: {
                    translatable: this.getTranslatable()
                }
            });

            this.setScrollable(scrollable);
        }
    },

    updateDirection: function(direction) {
        this.currentAxis = (direction === 'horizontal') ? 'x' : 'y';
        this.getScrollable().getScroller().setDirection(direction);
    },

    getTranslatable: function() {
        var translatable = this.translatable,
            itemLength;

        if (!translatable) {
            itemLength = this.getItemLength();

            this.translatable = translatable = this.getScrollable().getScroller().getTranslatable();
            translatable.setConfig({
                // Array of translatable items (calls translate on this)
                items: this.listItems,
                itemLength: {
                    x: 0,
                    y: itemLength
                },
                activeIndex: 0
            });

            this.bind(translatable, 'doTranslate', 'onTranslate');
        }

        return translatable;
    },

    onTranslate: function(x, y, args) {
        var itemLength = this.getItemLength(),
            listItems = this.listItems,
            itemsCount = listItems.length,
            currentTopIndex = this.topItemIndex,
            topIndex, changedCount, i, item;

        if (this.currentAxis == 'x') {
            topIndex = Math.floor(-x / itemLength);

            if (x <= 0) {
                x %= itemLength;
                args[0] = x;
            }
        }
        else {
            topIndex = Math.floor(-y / itemLength);

            if (y <= 0) {
                y %= itemLength;
                args[1] = y;
            }
        }

        this.topItemIndex = topIndex = Math.max(0, topIndex);

        if (currentTopIndex != topIndex) {
            if (currentTopIndex > topIndex) {
                changedCount = Math.min(itemsCount, currentTopIndex - topIndex);

                for (i = changedCount - 1; i >= 0; i--) {
                    item = listItems.pop();
                    listItems.unshift(item);
                    this.fireEvent('itemindexchange', this, item, i + topIndex);
                }
            }
            else {
                changedCount = Math.min(itemsCount, topIndex - currentTopIndex);

                for (i = 0; i < changedCount; i++) {
                    item = listItems.shift();
                    listItems.push(item);
                    this.fireEvent('itemindexchange', this, item, i + topIndex + itemsCount - changedCount);
                }
            }
        }
    },

    setItemsCount: function(newItemCount) {
        var innerItems = this.getInnerItems(),
            currentItemCount = innerItems.length,
            listItems = this.listItems,
            itemConfig = this.dataview.getItemConfig(),
            i, item;

        if (newItemCount > currentItemCount) {
            for (i = currentItemCount; i < newItemCount; i++) {
                item = Ext.factory(itemConfig, Ext.dataview.component.DataItem);
                this.doAdd(item);
            }
        }

        listItems.length = 0;
        listItems.push.apply(listItems, innerItems);
    },

    refresh: function() {
        var listItems = this.listItems,
            topIndex = this.topItemIndex,
            element = this.element,
            itemLength = this.getItemLength(),
            containerSize, i, ln;

        containerSize = element['get' + (this.getDirection() === 'horizontal') ? 'Width' : 'Height']();

        this.setItemsCount(Math.ceil(containerSize / itemLength) + 1);

        for (i = 0, ln = listItems.length; i < ln; i++) {
            this.fireEvent('itemindexchange', this, listItems[i], i + topIndex);
        }
    }
});
