Ext.define('Ext.layout.TableBox', {
    extend: 'Ext.layout.Default',

    requires: [
        'Ext.util.Wrapper'
    ],

    alias: 'layout.tablebox',

    config: {
        align: 'center'
    },

    layoutBaseClass: 'layout-tablebox',

    itemClass: 'layout-tablebox-item',

    insertInnerItem: function(item, index) {
        var container = this.container,
            containerDom = container.innerElement.dom,
            itemWrapper =
            itemDom = item.element.dom,
            nextSibling = container.getInnerAt(index + 1),
            nextSiblingDom = nextSibling ? nextSibling.element.dom : null;

        containerDom.insertBefore(itemDom, nextSiblingDom);

        return this;
    },

    updateOrient: function(orient) {
        var containerDom;

        if (orient === 'horizontal') {
            containerDom = Ext.Element.create({});
        }
        else {
            elementConfig = {
                children: [{}]
            };
        }
    },

    createItemWrapper: function(item) {
        var orient = this.getOrient(),
            elementConfig;

        if (orient === 'horizontal') {
            elementConfig = {};
        }
        else {
            elementConfig = {
                children: [{}]
            };
        }

        return new Ext.util.Wrapper(item, {});
    },

    removeInnerItem: function(item) {
        item.element.detach();
    }
});
