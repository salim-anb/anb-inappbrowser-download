var exec = require('cordova/exec');

function download(url, filename, successCallback, errorCallback){
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
        filename: filename,
        targetPath: targetPath,
        options: options
    };
    document.addEventListener('deviceready', function () {
        setTimeout(function() {
            downloadDocument(args, function(entry, contentType){
                if (!!successCallback && typeof(successCallback) === 'function'){
                    successCallback(entry, contentType);
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

function downloadDocument(args, successCallback, errorCallback){
    var uri = encodeURI(args.url);
    var filename = encodeURI(args.filename);
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
        console.log('file system open: ' + fs.name);
        fs.root.getFile(filename, { create: true, exclusive: false }, function (fileEntry) {
            console.log('fileEntry is file? ' + fileEntry.isFile.toString());
            var oReq = new XMLHttpRequest();
            // Make sure you add the domain name to the Content-Security-Policy <meta> element.
            oReq.open("GET", uri, true);
            // Define how you want the XHR data to come back
            oReq.responseType = "blob";
            
            oReq.onload = function (e) {      
                var blob = oReq.response;
                 if (blob) {
                     console.log("we have blob");
                     
                     fileEntry.createWriter(function(fileWriter) {
                        console.log("createWriter--------------	");
                         fileWriter.onwriteend = function(e) {
                            var contentType = oReq.getResponseHeader("content-type");
                             if (!!successCallback && typeof(successCallback) === 'function'){
                                 successCallback(fileEntry, contentType);
                             }
                         };

                         fileWriter.onerror = function(error) {
                           console.log('Write failed: ' + error.toString());
                            if (!!errorCallback && typeof(errorCallback) === 'function'){
                                errorCallback(error);
                            }
                         };
                         
                         fileWriter.write(blob);
                     })
                } else console.error('we didnt get an XHR response!');
            };
            oReq.onerror = function(error) {
                if (!!errorCallback && typeof(errorCallback) === 'function'){
                    errorCallback(error);
                }
                console.log("download error source " + error.source);
                console.log("download error target " + error.target);
                console.log("upload error code" + error.code);
            },
            oReq.send(null);
        }, function (err) { console.error('error getting file! ' + err); });
    }, function (err) { console.error('error getting persistent fs! ' + err); });
}

function isIphoneX() {
    try {
        const iphoneModel = window.device.model;
        const m = iphoneModel.match(/iPhone(\d+),?(\d+)?/);
        const model = +m[1];

        //https://www.theiphonewiki.com/wiki/Models#iPhone
        //10.1, 10.2, 10.4 and 10.5 are iphone 8 and 8 plus
        if (model > 10 && model != 10.1 && model != 10.2 && model != 10.4 && model != 10.5) { // is iphone X
            return true;
        }
    } catch (e) { }

    return false;
}

exports.close = function(){
    window.inAppBrowserRef.close();
}

exports.open = function (arg0, success, error) {
    var fileOpenMode = "open";
    var fileOpenModes = ["open", "dialog"];
    var autoFixHeaderSize = true;
    
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
    if (arg0.autoFixHeaderSize != undefined){
        autoFixHeaderSize = arg0.autoFixHeaderSize;
    }
    
    var url = arg0.inAppBrowserUrl;
    var inAppBrowserOptions = arg0.inAppBrowserOptions;
    var buttonClassName = arg0.buttonClassName;

    window.inAppBrowserRef = cordova.InAppBrowser.open(url, '_blank',  inAppBrowserOptions);
    
    //add viewport-fit=cover so we can fill the left and right sides of the notch (if it exists)
    var script = "var metaViewport = document.querySelector('meta[name=viewport]');" +
                 "var metaViewportContent = metaViewport.getAttribute('content') + ', user-scalable=no, viewport-fit=cover';" +
                 "metaViewport.setAttribute('content', metaViewportContent);";
    
    //add html classes to know if it is an iphonex and above with notch
    if (isIphoneX()){
        script += "document.getElementsByTagName(\"body\")[0].classList.add(\"iphone-x\");";
    }
    
    //if no setTimeout the click event listener is not added on android
    script += "setTimeout(function(){" +
                "var downloadButtons = document.querySelectorAll(\"." + buttonClassName + "\");" +
                "downloadButtons.forEach(function(downloadButton){ " +
                    "if (downloadButton) {" +
                        "downloadButton.addEventListener('click', function(e){" +
                            "var args = {" +
                                "url: downloadButton.dataset.documenturl," +
                                "filename: downloadButton.dataset.filename" +
                            "};" +
                            "webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(args));" +
                        "});" +
                    "}" +
                "});" +
            "}, 500);";
    
    window.inAppBrowserRef.addEventListener('loadstop', function() {
        window.inAppBrowserRef.executeScript({code: script});
        
        if(autoFixHeaderSize && cordova.platformId === 'ios') {
            window.inAppBrowserRef.insertCSS({ code: ".header {padding-top: env(safe-area-inset-top)} .content {margin-top: env(safe-area-inset-top)}" });
        }
    });
    
    window.inAppBrowserRef.addEventListener('message', function(args) {
        console.log('MESSAGE RECEIVED FROM IN_APP_BROWSER');
        download(args.data.url, args.data.filename, function(entry, contentType){
            if (fileOpenMode === "open"){
                cordova.plugins.fileOpener2.open(entry.toURL(), contentType,
                    function(e){
                        error(e);
                    },
                    function(){
                        success();
                    }
                );
            }
            if (fileOpenMode === "dialog"){
                if (cordova.platformId === 'android'){
                    cordova.plugins.fileOpener2.save(entry.toURL(), args.data.filename, contentType,
                        function(e){
                            error(e);
                        },
                        function(){
                            success();
                        }
                    );
                } else if(cordova.platformId === 'ios'){
                    cordova.plugins.fileOpener2.showOpenWithDialog(entry.toURL(), contentType,
                        function(e){
                            error(e);
                        },
                        function(){
                            success();
                        }
                    );
                }
            }
        }, function(e){
            error(e)
        });
    });
};