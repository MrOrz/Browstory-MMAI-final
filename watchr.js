$(function() {
  chrome.extension.sendRequest({"location": window.loaction.href}, function(response) {
    console.log("Request send");
  });  
});
