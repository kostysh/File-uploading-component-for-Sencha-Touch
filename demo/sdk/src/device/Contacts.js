/**
 * This device API allows you to access a users contacts using a {@link Ext.data.Store}. This allows you to search, filter
 * and sort through all the contacts using its methods.
 *
 * To use this API, all you need to do is require this class (`Ext.device.Contacts`) and then use `Ext.device.Contacts.getStore()`
 * to retrieve the store.
 *
 * **Please note that this will *only* work using the Sencha Native Packager.**
 * 
 * # Example
 *
 *     Ext.setup({
 *         requires: 'Ext.device.Contacts',
 *
 *         setup: function() {
 *             Ext.Viewport.add({
 *                 xtype: 'list',
 *                 itemTpl: '{first} {last}',
 *                 store: Ext.device.Contacts.getStore()
 *             });
 *         }
 *     });
 *
 * # Available fields
 *
 * ##### {@link String} **first** - *the first name of the contact*
 *
 *     console.log(record.get('first'));
 *     // Robert
 *    
 * ##### {@link String} **last** - *the last name of the contact*
 *
 *     console.log(record.get('last'));
 *     // Dougan
 *
 * ##### {@link String} **company** - *the contacts company*
 *
 *     console.log(record.get('company'));
 *     // Sencha Inc.
 *     
 * ##### {@link String} **created_at** - *when the contact was created*
 *
 *     console.log(record.get('created_at'));
 *     // 2012-06-20 21:07:31 +0000
 * 
 * ##### {@link String} **updated_at** - *when the contact was last updated*
 *
 *     console.log(record.get('updated_at'));
 *     // 2012-06-20 21:07:31 +0000
 * 
 * ##### {@link Array} **profiles** - *an array of social profiles for this contact*
 *
 *     console.log(record.get('profiles'));
 *     // [
 *     //     {
 *     //         'service' : 'twitter',
 *     //         'url' : 'http://twitter.com/rdougan',
 *     //         'username' : 'rdougan'
 *     //     }
 *     // ]
 * 
 * ##### {@link Object} **addresses** - *an object of addresses for this contact, where the property is the `name` of the address*
 *
 *     console.log(record.get('addresses'));
 *     // {
 *     //     'home' : {
 *     //         'City' : 'Redwood City',
 *     //         'Country' : 'United States',
 *     //         'CountryCode' : 'us',
 *     //         'State' : 'CA',
 *     //         'Street' : '999 Seaport Blvd.',
 *     //         'ZIP' : '94063'
 *     //     },
 *     //     'work' : {
 *     //         'City' : 'Redwood City',
 *     //         'Country' : 'United States',
 *     //         'CountryCode' : 'us',
 *     //         'State' : 'CA',
 *     //         'Street' : '1700 Seaport Blvd., Suite 120',
 *     //         'ZIP' : '94063'
 *     //     }
 *     // }
 * 
 * ##### {@link Object} **phones** - *an object of phones for this contact, where the property is the `name` of the phone number*
 *
 *     console.log(record.get('phones'));
 *     // {
 *     //     'home' : '(650) 123-9876',
 *     //     'work' : '(650) 123-1234'
 *     // }
 * 
 * ##### {@link Object} **dates** - *an object of special dates (i.e. birthday) for this contact, where the property is the `name` of the date*
 *
 *     console.log(record.get('dates'));
 *     // {
 *     //     'anniversary' : '2011-02-22 12:00:00 +0000'
 *     // }
 * 
 * ##### {@link Object} **emails** - *an object of emails for this contact, where the property is the `name` of the email*
 *
 *     console.log(record.get('emails'));
 *     // {
 *     //     'home' : 'rdougan@me.com',
 *     //     'work' : 'rob@sencha.com'
 *     // }
 * 
 * ##### {@link Object} **related_people** - *an object of related people for this contact, where the property is the `name` of the related person*
 *
 *     console.log(record.get('related_people'));
 *     // {
 *     //     'friend' : 'Alexander Voloshyn'
 *     // }
 * 
 * ##### {@link Object} **urls** - *an object of urls for this contact, where the property is the `name` of the url*
 *
 *     console.log(record.get('urls'));
 *     // {
 *     //     'work' : 'http://sencha.com',
 *     //     'personal' : 'http://robertdougan.com'
 *     // }
 *
 * @mixins Ext.device.contacts.Abstract
 *
 * @aside guide native_apis
 */
Ext.define('Ext.device.Contacts', {
    singleton: true,

    requires: [
        'Ext.device.Communicator',
        'Ext.device.contacts.Sencha'
    ],

    constructor: function() {
        var browserEnv = Ext.browser.is;

        // if (browserEnv.WebView && !browserEnv.PhoneGap) {
            return Ext.create('Ext.device.contacts.Sencha');
        // } else {
            // return Ext.create('Ext.device.contacts.Abstract');
        // }
    }
});
