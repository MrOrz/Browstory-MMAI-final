/*
 * history-view.js
 *
 */

;(function(chrome, undefined){
  "use strict";
  var 
    // cached variables
    $table,
    getTime = function(timestamp){
      return "" + new Date(timestamp);
    };

  // init script
  $(function(){
    $table = $('tbody');

    $.initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql('SELECT * FROM entry;', [], function(tx, results){
          var i, htmlStr;
          for (i = 0; i < results.rows.length; i+=1) {
            htmlStr += '<tr>' +
                         '<td>' + results.rows.item(i).id + '</td>' +
                         '<td><img src="' + 
                            results.rows.item(i).screenshot + '" class="thumb" /><img src="' + 
                            results.rows.item(i).screenshot + '" class="orig" /></td>' +
                         '<td>' + results.rows.item(i).url + '</td>' +
                         '<td>' + getTime(results.rows.item(i).timestamp) + '</td>' +
                       '</tr>';
          }

          $table.append(htmlStr);
        }, function(){
          console.error('Read Transaction Error', arguments);
        });
      });
    });
  });
  
})(chrome);
