/*
 * db.js
 *
 * Declaring $.initDB deferred object, which provides db in the done callback.
 *
*/
(function(openDatabase, undefined){
  "use strict";
  var
    // constants
    DB_VERSION = "0.1",
    DB_SIZE = 50 * 1024 * 1024; // 10MB database

  // The variable db must be guarded because even though openDatabase() method
  // is synchronous, its database creation callback is not.
  // If the table 'entry' is not created before it is selected, errors would
  // occur.
  //
  // reference: http://goo.gl/QAIUE
  //
  //
  $.initDB = (function(){
    var
      dfd = $.Deferred(),
      db = openDatabase('link-recording', DB_VERSION, 'link recording', DB_SIZE);

    // console.log('database init');

    db.transaction(function(tx){
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS entry(' +
          'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
          'url TEXT NOT NULL,' +
          'screenshot TEXT,' +
          'timestamp INTEGER,' +
          'visits INTEGER DEFAULT 0,' +
          'active INTEGER DEFAULT 0' +
        ');');
    }, [], function(results){
      // transaction success callback
      dfd.resolve(db);
    }, function(tx, e){
      // transaction error callback
      console.error('DB Creation Error', e);
      dfd.reject(e);
    });

    return dfd.promise();
  }());

}(window.openDatabase));
