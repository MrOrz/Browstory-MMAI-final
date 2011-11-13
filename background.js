/*
 * background.js
 *
 */

;(function($, chrome, undefined){
  "use strict";
  // add request listener
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      console.log('saving', sender.tab.url);

      console.log('sender.tab', sender.tab);

      var dfdScreenshot = $.Deferred();
      chrome.tabs.captureVisibleTab(null, function(img) {
        dfdScreenshot.resolve(img)
      });

      // Wait for both screenshot and initDB to complete
      // before inserting the record into database.
      $.when($.initDB, dfdScreenshot).done(function(db, img){
        db.transaction(function(tx){
          tx.executeSql('INSERT INTO entry (url, screenshot, timestamp) VALUES (?, ?, ?);', 
            [sender.tab.url, img, Date.now()], function(tx, results){
            console.log('insertion complete, results=', results);
          }, function(){
            console.error('Transaction Error', arguments);
          });
        });
      });
    }
  );

  // add button click listener
  chrome.browserAction.onClicked.addListener(function(tab) {
    var history_url = chrome.extension.getURL('history-view.html');
    chrome.tabs.create({url: history_url}, function() {});
  });
  
})(jQuery, chrome);
