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
          'title TEXT,' +
          'screenshot TEXT,' +
          'structure_screenshot TEXT,' +
          'timestamp INTEGER,' +
          'rect TEXT,' +
          'visits INTEGER DEFAULT 0,' +
          'lastview INTEGER DEFAULT 0,' +
            // updated even on tab switching! Different from HistoryItem's lastVisited
          'active INTEGER DEFAULT 0' +
        ');'
      );
      tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS entry_idx ON entry(url);');
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS structure(' +
          'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
          'entry_id INTEGER NOT NULL,' +
          's0 INTEGER NOT NULL,' +
          's1 INTEGER NOT NULL,' +
          's2 INTEGER NOT NULL,' +
          's3 INTEGER NOT NULL,' +
          's4 INTEGER NOT NULL,' +
          's5 INTEGER NOT NULL ' +
        ');'
      );
      tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS structure_idx ON structure(entry_id);');
      /*
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS colormap(' +
          'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
          'entry_id INTEGER NOT NULL,' +
          'color INTEGER NOT NULL,' +
          'c0 BOOLEAN NOT NULL,' +
          'c1 BOOLEAN NOT NULL,' +
          'c2 BOOLEAN NOT NULL,' +
          'c3 BOOLEAN NOT NULL,' +
          'c4 BOOLEAN NOT NULL,' +
          'c5 BOOLEAN NOT NULL,' +
          'c6 BOOLEAN NOT NULL,' +
          'c7 BOOLEAN NOT NULL,' +
          'c8 BOOLEAN NOT NULL ' +
        ');' +
        'CREATE UNIQUE INDEX IF NOT EXISTS colormap_idx ON colormap(entry_id, color);'
      );
      */
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

  // utility function that returns query results as javascript array.
  //
  $.getItems = function(results){
    var i, items = [];
    for (i = 0; i < results.rows.length; i+=1) {
      items.push(results.rows.item(i));
    }
    return items;
  }

  /*
    @param tx: transaction object
    @param id: database entry id to update
    @param F:  feature vector of structure (6-d)
    @param callback: optional.
  */
  $.updatefv = function(tx, id, F, callback){
    tx.executeSql(
      'INSERT OR REPLACE INTO structure (entry_id, s0, s1, s2, s3, s4, s5) values (?,?,?,?,?,?,?);',
      [id, F[0], F[1], F[2], F[3], F[4], F[5]],
      callback
    );
  };

}(window.openDatabase));
