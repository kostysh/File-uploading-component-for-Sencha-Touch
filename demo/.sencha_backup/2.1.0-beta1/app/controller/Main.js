Ext.define('Fileup.controller.Main', {
    extend: 'Ext.app.Controller',
    
    requires: [
        'Ext.MessageBox',
        'Ext.Img'
    ],
    
    config: {
        refs: {
            'fileBtn': '#fileBtn',
            'welcome': '#welcome'
        },
        
        control: {
            fileBtn: {
                initialize: 'onFileBtnInit',
                submit: 'onFileBtnSubmit'
            }
        }
    },
    
    onFileBtnInit: function(fileBtn) {
        var me = this;
        
        console.log('Init');
        
        fileBtn.setCallbacks({
            scope: me,
            success: me.onFileUploadSuccess,
            failure: me.onFileUploadFailure
        });
    },
    
    onFileBtnSubmit: function() {
        console.log('Submit');
    },
    
    onFileUploadSuccess: function(response) {
        console.log('Success');
        
        var loaded = Ext.getCmp('loadedImage');
        
        if (loaded) {
            loaded.destroy();
        }
        
        var image = Ext.create('Ext.Img', {
            id: 'loadedImage',
            width: 250,
            height: 200,
            src: response.base64,
            style: 'background-size: contain; margin-top: 20px; border-radius: 15px;'
        });
        
        var wlc = Ext.getCmp('welcome');
        wlc.add(image);
        image.show('fadeIn');
        
        Ext.Msg.alert('File upload', 'Success!');
    },
    
    onFileUploadFailure: function() {
        console.log('Failure');
        Ext.Msg.alert('File upload', 'Failure!');
    }
});