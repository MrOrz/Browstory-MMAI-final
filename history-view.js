/*global chrome */
/*
 * history-view.js
 *
 */

(function(chrome, document, undefined){
  "use strict";
  var
    // cached variables
    $table,
    getTime = function(timestamp){
      return "" + new Date(timestamp);
    };

  // init script
  $(function(){
    $table = $('#tbody');

    // read all records
    //
    $.initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql('SELECT * FROM entry;', [], function(tx, results){
          var i, htmlStr = "";
          for (i = 0; i < results.rows.length; i+=1) {
            htmlStr += '<tr>' +
                         '<td>' + results.rows.item(i).id + '</td>' +
                         '<td><img src="' +
                            results.rows.item(i).screenshot + '" class="thumb" /><img src="' +
                            results.rows.item(i).screenshot + '" class="orig" /></td>' +
                         '<td>' + results.rows.item(i).url + '</td>' +
                         '<td>' + getTime(results.rows.item(i).timestamp) + '</td>' +
                         '<td>' + results.rows.item(i).structure_feature + '</td>' +
                         '<td>' + results.rows.item(i).active + '</td>' +
                       '</tr>';
          }
          document.getElementById('tbody').innerHTML = htmlStr;
          //$table.append(htmlStr);
        }, function(){
          console.error('Read Transaction Error', arguments);
        });
      });
    });

    // clear db button
    //
    $('.cleardb').click(function(){
      if(!confirm('Are you sure to drop database?')){
        return false;
      }
      $.initDB.done(function(db){
        db.transaction(function(tx){
          tx.executeSql('DROP TABLE IF EXISTS entry;', [], function(tx, results){
            location.reload();
          });
        });

      });

    });
  });

  // regenerate feature button
  //
  $('.regenerate').click(function(){
    if(!confirm('Are you sure to regenerate all feature?')){
      return false;
    }

    $.initDB.done(function(db){
      db.transaction(function(tx){
        tx.executeSql('SELECT id, url, screenshot FROM entry;', [], function(tx, results){
          var structure_feature, item, i;

          for (i = 0; i < results.rows.length; i+=1) {
            item = results.rows.item(i);
            console.log('Processing: ', item.url);
            // get new feature from item.screenshot
            // TODO
            tx.executeSql('UPDATE structure_feature SET structure_feature = ? WHERE id = ?',
             [structure_feature, item.id])
          }
        }, function(){
          console.error('Transaction Error', arguments);
        });
      });
    });
  });

}(chrome, document));
