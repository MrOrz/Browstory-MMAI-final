/*global chrome, processImage */
/*
 * background.js
 *
 */

(function($, chrome, undefined){
  "use strict";

  var
    _dbIdOf = {}, // maps current tab id to database id
    _selectedTab,
    /*
      _selectedTab = {
        id: "#{window_id}-#{tab_id}",
        tabId: #{tab_id}
        windowId: #{window_id}
        activated: selected_time
      }
    */
    txErr = function(){
      console.error('transaction error', arguments);
    },
    // getter / setter of _idOf map
    // the setter returns the old value.
    dbIdOf = function(windowId, tabId, dbId){
      var
        id = '' + windowId + '-' + tabId,
        ret = _dbIdOf[id];

      if(dbId !== undefined){ // setter
        _dbIdOf[id] = dbId;
      }
      return ret;
    },
    screenshot = (function(){
      var _pendingScreenshot = {}, // map of pending tabs -> true
      ret = {
        take: function(windowId, tabId){
          $.initDB.done(function(db){
            chrome.tabs.captureVisibleTab(windowId, function(img){
              console.log('Taking screenshot for (winId, tabId)=', windowId, tabId);
              // save the image into database
              db.transaction(function(tx){
                tx.executeSql('UPDATE entry SET screenshot=? WHERE id=?;', [img, dbIdOf(windowId, tabId)]);
              }, txErr);

              // process the image
              processImage(img);
            });
          });
        },
        pending: function(windowId, tabId){
          _pendingScreenshot[''+windowId+'-'+tabId] = true;
        },
        process: function(windowId, tabId){
          if(_pendingScreenshot[''+windowId+'-'+tabId]){
            ret.take(windowId, tabId);
            // pending screenshot done, delete entry
            delete _pendingScreenshot[''+windowId+'-'+tabId];
          }
        }
      };
      return ret;
    }()),
    // getter / setter of _selectedTab.
    // the setter returns the old value.
    selectedTab = function(windowId, tabId){
      var ret = _selectedTab, activeTime, dbId;

      if(arguments.length === 2){ // setter
        if(ret){ // if has old selected tab
          dbId = dbIdOf(ret.windowId, ret.tabId); // find its db id

          if(dbId){ // if it is registered in db
          activeTime = Date.now() - ret.activated;
            // update the entry of original selected tab
            $.initDB.done(function(db){
              db.transaction(function(tx){
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
                    }, txErr
                  );
                }, txErr);
              });
            });
          }
        }
        // set selected tab
        _selectedTab = {
          tabId: tabId,
          'windowId': windowId,
          activated: Date.now()
        }

      }
      return ret;
    };

 // add request listener
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");

      // Wait for both screenshot and initDB to complete
      // before inserting the record into database.
      $.when($.initDB).done(function(db){
        db.transaction(function(tx){
          tx.executeSql('INSERT INTO entry (url, timestamp) VALUES (?, ?);',
            [sender.tab.url, request.time], function(tx, results){
            console.log('insertion complete, results=', results);

            // maintain dbIdOf mapping
            dbIdOf(sender.tab.windowId, sender.tab.id, results.insertId);

            if(sender.tab.active){
              // tab is still active, take screenshot now
              screenshot.take(sender.tab.windowId, sender.tab.id);
            }else{
              // tab goes inactive before page on load.
              // register the tab in _pendingScreenshot queue

              screenshot.pending(sender.tab.windowId, sender.tab.id);
            }
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
  chrome.tabs.onActiveChanged.addListener(function(tabId, selectInfo){
    var origSelectedTab = selectedTab(selectInfo.windowId, tabId), // set new selected tab
      tab = selectedTab();
    console.log('Tab changed from' , origSelectedTab, ' to tab ', tab );

    if(tab){
        // take screenshot if the selected tab is in _pendingScreenshot
        screenshot.process(tab.windowId, tab.tabId);
      }
  });

  console.log('background.js initialized.');
}(jQuery, chrome));
