"use strict";

$(function() {
  chrome.extension.sendRequest({"location": window.location.href}, function(response) {
    console.log("Request send");
  });  
});
