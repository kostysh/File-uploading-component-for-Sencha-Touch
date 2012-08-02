/**
 * @private
 */
Ext.define('Ext.device.contacts.Sencha', {
    extend: 'Ext.device.contacts.Abstract',

    getStore: function() {
        if (!this.store) {
            this.store = Ext.create('Ext.data.Store', {
                fields: [
                    'first',
                    'last',
                    'addresses',
                    'phones',
                    'company',
                    'created_at',
                    'dates',
                    'emails',
                    'updated_at',
                    'profiles',
                    'related_people',
                    'urls'
                ]
            });
        }

        // Load the store
        this.loadStore();

        return this.store;
    },

    loadStore: function() {
        Ext.device.Communicator.send({
            command: 'Contacts#all',
            callbacks: {
                success: this.onAllSuccess,
                failure: this.onAllFailure
            },
            scope: this
        });
    },

    onAllSuccess: function(contacts) {
        var ln = contacts.length,
            store = this.store,
            fields = [],
            contact, i, field;

        store.removeAll();

        for (i = 0; i < ln; i++) {
            contact = contacts[i];
            for (field in contact) {
                if (fields.indexOf(field) == -1) {
                    fields.push(field);
                }
            }
        }

        // update the store model fields
        store.getModel().setFields(fields);

        // update the stores data with the contacts
        store.setData(contacts);
    },

    onAllFailure: function() {
        console.log('onAllFailure');
    }
});
