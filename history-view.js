/*
 * history-view.js
 *
 */

;(function(chrome, undefined){
  "use strict";
  var 
    // constants
    DB_VERSION = "0.1",
    DB_SIZE = 50 * 1024 * 1024, // 10MB database
    // cached variables
    $table,
    nullHandler = function(){},
    errHandler = function(){
      console.error('DB error', arguments);
    },
    getTime = function(timestamp){
      return "" + new Date(timestamp);
    },


    // The variable db must be guarded because even though openDatabase() method
    // is synchronous, its database creation callback is not.
    // If the table 'entry' is not created before it is selected, errors would 
    // occur.
    //
    // reference:
    // http://developer.apple.com/library/safari/#documentation/iPhone/Conceptual/SafariJSDatabaseGuide/UsingtheJavascriptDatabase/UsingtheJavascriptDatabase.html#//apple_ref/doc/uid/TP40007256-CH3-SW1
    // 
    initDB = (function(){
      var
        dfd = $.Deferred(),
        db = openDatabase('link-recording', DB_VERSION, 'link recording', DB_SIZE);

      console.log('database init');

      db.transaction(function(tx){
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS entry(' + 
            'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' + 
            'url TEXT NOT NULL,' +
            'screenshot TEXT,' +
            'timestamp INTEGER' +
          ');');
      }, [], function(results){
        // transaction success callback
        console.log('CREATE TABLE IF NOT EXIST result:', results);
        dfd.resolve(db);
      }, function(tx, e){
        // transaction error callback
        console.error('DB Creation Error', e);
        dfd.reject(e);
      });

      return dfd.promise();
    })();
    // end of var declairation

  // init script
  $(function(){
    $table = $('tbody');
    initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql('SELECT * FROM entry;', [], function(tx, results){
          var i, htmlStr;
          for (i = 0; i < results.rows.length; i+=1) {
            htmlStr += '<tr>' +
                         '<td>' + results.rows.item(i).id + '</td>' +
                         '<td><img src="' + results.rows.item(i).screenshot + '"/></td>' +
                         '<td>' + results.rows.item(i).url + '</td>' +
                         '<td>' + getTime(results.rows.item(i).timestamp) + '</td>' +
                       '</tr>';
          }

          $table.append(htmlStr);
        }, errHandler);
      });
    });
  });
  
})(chrome);
