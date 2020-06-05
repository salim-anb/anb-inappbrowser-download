var exec = require('cordova/exec');

function download(url, successCallback, errorCallback){
    var extension = url.substr(url.length - 4);
    if (extension == '.pdf') {
        var targetPath = "";
        if (cordova.platformId === 'android') {
            targetPath = cordova.file.externalCacheDirectory + "contract.pdf";
        }
        else if(cordova.platformId === 'ios') {
            targetPath = cordova.file.documentsDirectory + "contact.pdf";
        }
        var options = {};
        var args = {
        url: url,
        targetPath: targetPath,
        options: options
        };
        //ref.close(); // close window or you get exception
        document.addEventListener('deviceready', function () {
            setTimeout(function() {
                //window.open(url, '_system', 'location=no,closebuttoncaption=Cerrar,toolbar=yes,enableViewportScale=yes');
                downloadDocument(args,
                                function(entry){
                    if (!!successCallback && typeof(successCallback) === 'function'){
                        successCallback(entry);
                    }
                    console.log("download complete: " + entry.toURL());
                }, function(error){
                    if (!!errorCallback && typeof(errorCallback) === 'function'){
                        errorCallback(error);
                    }
                    console.log("download error source " + error.source);
                    console.log("download error target " + error.target);
                    console.log("upload error code" + error.code);
                }); // call the function which will download the file 1s after the window is closed, just in case..
            }, 1000);
        });
    }
}

function downloadDocument(args, successCallback, errorCallback) {
    var fileTransfer = new FileTransfer();
    var uri = encodeURI(args.url);
    
    fileTransfer.download(
                        uri, // file's uri
                        args.targetPath, // where will be saved
                        function(entry) {
        if (!!successCallback && typeof(successCallback) === 'function'){
            successCallback(entry);
        }
        console.log("download complete: " + entry.toURL());
        //window.open(entry.toURL(), '_blank', 'location=no,closebuttoncaption=Cerrar,toolbar=yes,enableViewportScale=yes');
    },
                        function(error) {
        if (!!errorCallback && typeof(errorCallback) === 'function'){
            errorCallback(error);
        }
        console.log("download error source " + error.source);
        console.log("download error target " + error.target);
        console.log("upload error code" + error.code);
    },
                        true,
                        args.options
                        );
}

exports.open = function (arg0, success, error) {
    var fileOpenMode = "open";
    var fileOpenModes = ["open", "dialog"];
    
    if (!arg0.inAppBrowserUrl || arg0.inAppBrowserUrl.length === 0){
        error("Please set the url parameter");
        return;
    }
    if (!arg0.buttonClassName || arg0.buttonClassName.length === 0){
        error("Please set the buttonClassName parameter");
        return;
    }
    if (arg0.fileOpenMode && fileOpenModes.includes(arg0.fileOpenMode)){
        fileOpenMode = arg0.fileOpenMode;
    }
    
    var url = arg0.inAppBrowserUrl;
    var inAppBrowserOptions = arg0.inAppBrowserOptions;
    var buttonClassName = arg0.buttonClassName;

    //override window open
    var ref = cordova.InAppBrowser.open(url, '_blank',  inAppBrowserOptions);
    
    ref.addEventListener('loadstop', function() {
        ref.executeScript({code:
            "setTimeout(function(){" +
                "var elem = document.getElementsByClassName(\"" + buttonClassName + "\")[0];" +
                "if (elem){" +
                    "elem.addEventListener('click', function(e){" +
                        "var args = {url: elem.dataset.documenturl};" +
                        "webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(args));" +
                    "});" +
                "}" +
            "}, 500);"
        });
    });
    
    ref.addEventListener('message', function(args) {
        console.log('MESSAGE RECEIVED FROM IN_APP_BROWSER');
        download(args.data.url, function(entry){
            if (fileOpenMode === "open"){
                cordova.plugins.fileOpener2.open(entry.toURL(), "application/pdf",
                    function(e){
                        error(e);
                    },
                    function(){
                        success();
                    }
                );
            }
            if (fileOpenMode === "dialog"){
                cordova.plugins.fileOpener2.showOpenWithDialog(entry.toURL(), "application/pdf",
                    function(e){
                        error(e);
                    },
                    function(){
                        success();
                    }
                );
            }
        }, function(e){
            error(e)
        });
    });
};