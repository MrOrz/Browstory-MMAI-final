/*global chrome */
/*
 * watchr.js
 *
 * injected content script
 *
*/
(function(window, document, undefined){
  "use strict";
  var initTime = Date.now();

  // content script runs at document_idle
  chrome.extension.sendRequest({"time": initTime}, function(response) {
    console.log("Request send");
  });
}(window, document));
