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

  document.onready = function() {
    chrome.extension.sendRequest({"time": initTime}, function(response) {
      console.log("Request send");
    });
  };
}(window, document));
