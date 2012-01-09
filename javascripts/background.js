/*global chrome, segmentation */
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
          ret,
          img = new Image(),
          onLoadCallback, // image onload callback
          canvas;

      // image onload
      //
      img.onload = function(e){onLoadCallback(e);};

      // populate canvas
      $(function(){
        canvas= document.getElementById('canvas'); // resize canvas
      });

      // object to return
      ret = {
        take: function(windowId, tabId, request){
          console.info('Taking screenshot for (winId, tabId)=', windowId, tabId);
          chrome.tabs.captureVisibleTab(windowId, function(screenshot){
            // setting onLoadCallback within current variable namespace
            // (windowId, tabId available)
            //
            onLoadCallback = function(){

              // Now $img contains shrinked image.
              // Copy the image content to canvas.
              //
              var cropContainer = request.container[0],
                  shrinkRatio = 300/cropContainer.width,
                  rect = request.container.slice(1);
              canvas.width = 300; canvas.height = shrinkRatio * img.height;

              /*
                         request.width
                             -->
                  scaled  canvas width
                   left /    300      \
                  ___________________________
                 |      |             |      |
                 |      |             |      |
                            scaled
                  \        img width         /
               */

              canvas.getContext('2d').drawImage(img,
                -cropContainer.left*shrinkRatio, 0,
                img.width*shrinkRatio, canvas.height);

              // shrinking the rect
              //
              $.each(rect, function(i, r){
                rect[i].left *= shrinkRatio;
                rect[i].top *= shrinkRatio;
                rect[i].width *= shrinkRatio;
                rect[i].height *= shrinkRatio;
              })
              var dataURL = canvas.toDataURL();
              // save the canvas image to database
              //
              $.initDB.done(function(db){
                // process the image
                //
                var result = segmentation(canvas, rect, true),
                  structure_dataURL = result.canvas.toDataURL();
                // save the image into database
                db.transaction(function(tx){
                  tx.executeSql(
                    'UPDATE entry SET screenshot=?, structure_screenshot=?, ' +
                    'rect=? WHERE id=?;',
                    [dataURL, structure_dataURL, JSON.stringify(rect), dbIdOf(windowId, tabId)], function(tx, result){
                      console.log('update screenshot affected result', result);
                    });
                }, txErr);
                db.transaction(function(tx){
                  $.updatefv(tx, dbIdOf(windowId, tabId), result.structure, result.colormap);
                }, function(){
                  console.error('updatefv error', arguments);
                });
                console.info('... screenshot taken.');
              });

            }
            img.src = screenshot;
            // this will trigger img.onload.
          });
        },
        pending: function(windowId, tabId, request){
          _pendingScreenshot[''+windowId+'-'+tabId] = request;
        },
        process: function(windowId, tabId){
          var request = _pendingScreenshot[''+windowId+'-'+tabId];
          if(request){
            ret.take(windowId, tabId, request);
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
      var ret = _selectedTab, activeTime, lastViewed, dbId;

      if(arguments.length === 2){ // setter
        if(ret){ // if has old selected tab
          dbId = dbIdOf(ret.windowId, ret.tabId); // find its db id

          if(dbId){ // if it is registered in db
            lastViewed = Date.now();
            activeTime = lastViewed - ret.activated;
            // update the entry of original selected tab
            $.initDB.done(function(db){
              db.transaction(function(tx){
                  // the database id of original tab.

                //console.log('SELECT active FROM entry WHERE id = ?;', dbId);
                // select original active time
                tx.executeSql('SELECT active FROM entry WHERE id = ?;', [dbId], function(tx, results){
                  //console.log('original tab active time', results);
                  if(results.rows.length === 0){ // TODO: fix this
                    return;
                  }
                  var active = results.rows.item(0).active;

                  tx.executeSql('UPDATE entry SET active = ?, lastview = ? WHERE id = ?;',
                    [active + activeTime, lastViewed, dbId],
                    function(tx, results){
                      console.log('UPDATE result', results, 'active time becomes ', active + activeTime,
                        ', last viewed: ', lastViewed);
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
  // Fired when new page is loaded (DOM Ready)
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");

      // Wait for both screenshot and initDB to complete
      // before inserting the record into database.
      $.initDB.done(function(db){
        db.transaction(function(tx){
          tx.executeSql('SELECT id, visits FROM entry WHERE url = ?',
            [sender.tab.url], function(tx, results){

            var dbIdDfd = $.Deferred(); // resolved when dbId setting is done

            if(results.rows.length){ // the URL is visited before
              // Update visits. No operations is needed after visit number is updated.
              tx.executeSql('UPDATE entry SET title = ?, visits = ?, lastview = ? WHERE id = ?;',
                [request.title, results.rows.item(0).visits + 1, Date.now(), results.rows.item(0).id]);

              // maintain dbIdOf mapping
              dbIdOf(sender.tab.windowId, sender.tab.id, results.rows.item(0).id);
              dbIdDfd.resolve(sender.tab);
            }else{  // new URL visits
              tx.executeSql('INSERT INTO entry (title, url, timestamp, lastview) VALUES (?, ?, ?, ?);',
                [request.title, sender.tab.url, request.time, Date.now()], function(tx, results){

                console.log('insertion complete, results=', results);
                // maintain dbIdOf mapping
                dbIdOf(sender.tab.windowId, sender.tab.id, results.insertId);
                dbIdDfd.resolve(sender.tab);
              }, txErr);
            }

            dbIdDfd.promise().done(function(tab){
              // after dbIdOf is set, we can take screenshots now.
              if(tab.active){
                // tab is still active, take screenshot now
                screenshot.take(tab.windowId, tab.id, request);
              }else{
                // tab goes inactive before page on load.
                // register the tab in _pendingScreenshot queue

                screenshot.pending(tab.windowId, tab.id, request);
              }
            });
          }, txErr);
        });
      });
    }
  );

  // add button click listener
  chrome.browserAction.onClicked.addListener(function(tab) {
    var history_url = chrome.extension.getURL('html/history-view.html');
    chrome.tabs.create({url: history_url});
  });

  // change tab
  // update the original tab's active time
  //
  chrome.tabs.onActiveChanged.addListener(function(tabId, selectInfo){
    var origSelectedTab = selectedTab(selectInfo.windowId, tabId), // set new selected tab
      tab = selectedTab();
    //console.log('Tab changed from' , origSelectedTab, ' to tab ', tab );

    if(tab){
        // take screenshot if the selected tab is in _pendingScreenshot
        screenshot.process(tab.windowId, tab.tabId);
      }
  });

  chrome.history.onVisited.addListener(function(result) {
    console.log('history', result);
  });

  console.log('background.js initialized.');
}(jQuery, chrome));
