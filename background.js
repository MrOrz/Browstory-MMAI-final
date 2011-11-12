/*
 * background.js
 *
 */

;(function(chrome, indexedDB, IDBKeyRange, IDBTransaction, undefined){
  "use strict";
  var 
    // constants
    DB_VERSION = "0.1",
    BASIC_SCHEMA = {
      keyPath: 'id',
      autoIncrement: true
    },
    // cached variables
    $imgTarget,

    // Two helper functions that act like ActiveRecord models.
    // These functions return transaction objects so that they can be used as
    // Entry().add({......}).onsuccess(callback)
    // A fresh transaction object is constructed each time Entry() or Screenshot()
    // is invoked, so one invocation means one database transaction.
    //
    Entry, Screenshot,

    // deferred object for whether the db is initialized.
    initdb = (function(){
      var 
        dfd = $.Deferred(), // the deferred to return
        req = indexedDB.open('link-record'), // open db request
        req_ver;  // setVersion request

      req.onerror = function(e){
        dfd.reject(e);
      };

      req.onsuccess = function(e){
        var 
          db = req.result,
          ready = function(db){
            // populate Entry and Screenshot.
            Entry = function(write_enable){
              return db.transaction(['entry'], write_enable?IDBTransaction.READ_WRITE:IDBTransaction.READ_ONLY)
                .objectStore('entry');
            };
            Screenshot = function(write_enable){ 
              return db.transaction(['screenshot'], write_enable?IDBTransaction.READ_WRITE:IDBTransaction.READ_ONLY)
                .objectStore('screenshot'); 
            };

            // database & transaction ready.
            dfd.resolve(db);
          };
        console.log('Database opened', db);

        // register database error handler
        db.onerror = function(e){
          // all errors of database will bubble to this error handler
          console.error('DB Error', e);
        };

        // check and set version
        if(db.version !== DB_VERSION){
          console.log('setting version');
          req_ver = db.setVersion(DB_VERSION);
          req_ver.onsuccess = function(e){
            // the only place we can alter database structure.
            console.log('object store created.');
            var entries, screenshots;

            entries = db.createObjectStore('entry', BASIC_SCHEMA);
            // TODO: entries.createIndex to speed up queries
            screenshots = db.createObjectStore('screenshot', BASIC_SCHEMA);
            // TODO: Screenshot.createIndex to speed up queries

            ready(db);
          };
          req_ver.onfailure = db.onerror;
        }else{
          ready(db); //resolve immediately
        }
        
      }
      
      return dfd.promise();
    })();

    // end of var declairation

  // add request listener
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      console.log('saving',request.location);
      initdb.done(function(db){
        // TODO:
        // Maybe a transaction involving both entry and screenshot
        // is required. We should use db.transaction(['entry', 'screenshot']). ...
        // here.

        Entry(true).add({
          id: '',
          url: request.location
        }).oncomplete = function(e){
          var keypath = e.target.result;
          console.log('new keypath', keypath);
        };
      });
    }
  );

  // init script
  $(function(){
    $imgTarget = $('body');
    initdb.done(function(db){
      // print all entry in database now
      Entry().openCursor().onsuccess(function(e){
        var cursor = e.target.result;
        if(cursor){
          console.log('entry', cursor.key, ' = ', cursor.value);
          cursor.continue();
        }
      });

    })
  });
  
})(chrome, window.webkitIndexedDB, window.webkitIDBKeyRange, window.webkitIDBTransaction);
