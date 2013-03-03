Ext.define('Fileup.controller.Main', {
    extend: 'Ext.app.Controller',
    
    requires: [
        'Ext.MessageBox'
    ],
    
    config: {
        refs: {
            'fileBtn': '#fileBtn'
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
        Ext.Msg.alert('File upload', 'Success!');
    },
    
    onFileUploadFailure: function() {
        console.log('Failure');
        Ext.Msg.alert('File upload', 'Failure!');
    }
});