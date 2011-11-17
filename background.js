/*
 * background.js
 *
 */

;(function($, chrome, undefined){
  "use strict";

  var 
    _idOf = {}, // maps current tab id to database id
    _selectedTab, 
    /*
      _selectedTab = {
        id: "#{window_id}-#{tab_id}",
        windowId: #{window_id}
        activated: selected_time
      }
    */
    // getter / setter of _idOf map
    // the setter returns the old value.
    idOf = function(windowId, tabId, dbId){
      var 
        id = '' + windowId + '-' + tabId,
        ret = _idOf[id];

      if(dbId !== undefined){ // setter
        _idOf[id] = dbId;
      }
      return ret;
    },
    // getter / setter of _selectedTab.
    // the setter returns the old value.
    selectedTab = function(windowId, tabId){
      var ret = _selectedTab;

      if(arguments.length === 2){ // setter
        _selectedTab = {
           tabId: tabId,
           'windowId': windowId,
           activated: Date.now()
        }
      }
      return ret;
    }, 
    txErr = function(){
      console.error('transaction error', arguments);
    };


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
            [sender.tab.url, img, request.time], function(tx, results){
            console.log('insertion complete, results=', results);

            // maintain idOf mapping
            idOf(sender.tab.windowId, sender.tab.id, results.insertId);
          }, txErr);
        });
      });
    }
  );

  // add button click listener
  chrome.browserAction.onClicked.addListener(function(tab) {
    var history_url = chrome.extension.getURL('history-view.html');
    chrome.tabs.create({url: history_url});
  });
  
  // change tab
  // update the original tab's active time
  //
  chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo){

    var origSelectedTab = selectedTab(selectInfo.windowId, tabId), // set new selected tab
      activeTime = Date.now() - origSelectedTab.activated;
    console.log('Tab changed from' , origSelectedTab, ' to tab ', selectedTab() );
    
    // update database
    $.initDB.done(function(db){
      db.transaction(function(tx){
        var dbId = idOf(origSelectedTab.windowId, origSelectedTab.tabId);
          // the database id of original tab.

        console.log('SELECT active FROM entry WHERE id = ?;', dbId);
        // select original active time
        tx.executeSql('SELECT active FROM entry WHERE id = ?;', [dbId], function(tx, results){
          console.log('original tab active time', results);
          if(results.rows.length === 0){ // TODO: fix this
            return;
          }
          var active = results.rows.item(0).active;
          
          tx.executeSql('UPDATE entry SET active = ? WHERE id = ?;', 
            [active + activeTime, dbId],
            function(tx, results){
              console.log('UPDATE result', results, 'active time becomes ', active + activeTime);
            }, txErr);
        
        }, txErr);
      });
    });
    
    
  });
})(jQuery, chrome);
