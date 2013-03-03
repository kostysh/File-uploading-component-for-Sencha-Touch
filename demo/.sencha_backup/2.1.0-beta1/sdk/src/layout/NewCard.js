Ext.define('Ext.layout.NewCard', {
    extend: 'Ext.layout.Default',

    alias: 'layout.newcard',

    layoutClass: 'layout-newcard',

    itemClass: 'layout-newcard-item',

    setContainer: function(container) {
        var itemClass = this.itemClass,
            innerElement = container.innerElement;

        this.callSuper(arguments);

        this.activeCard = innerElement.createChild({
            classList: [itemClass, 'active']
        });
        this.inactiveCard = innerElement.createChild({
            className: itemClass
        });

        innerElement.addCls(this.layoutClass);
        container.onInitialized('onContainerInitialized', this);
    },

    onContainerInitialized: function() {
        var container = this.container,
            activeItem = container.getActiveItem();

        if (activeItem) {
            this.activeCard.append(activeItem.element);
        }

        container.on('activeitemchange', 'onContainerActiveItemChange', this);
    },

    /**
     * @private
     */
    onContainerActiveItemChange: function(container) {
        this.relayEvent(arguments, 'doActiveItemChange');
    },

    onItemInnerStateChange: function(item, isInner, destroying) {
        item.setLayoutSizeFlags(isInner ? this.container.getSizeFlags() : 0);
    },

    /**
     * @private
     */
    doActiveItemChange: function(me, newActiveItem, oldActiveItem) {
        var activeCard = me.activeCard;

        if (oldActiveItem) {
            activeCard.remove(oldActiveItem.element);
        }

        if (newActiveItem) {
            activeCard.append(newActiveItem.element);
        }
    }
});
