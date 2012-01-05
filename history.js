/* history.js for history.html */

$(function(){
  "use strict";
  var
    $target = $('#body'),
    $tmpl = $('#itemTemplate');

  $.initDB.done(function(db){
    db.readTransaction(function(tx){
      // clean up target
      $target.empty();

      tx.executeSql('SELECT * FROM entry;', [], function(tx, results){
        var i, htmlStr = "", items = [], item;
        for (i = 0; i < results.rows.length; i+=1) {
          item = results.rows.item(i);
          items.push({
            screenshot: item.screenshot,
            url:        item.url
          });
        }
        $tmpl.tmpl(items).appendTo($target);
      }, function(){
        console.error('Read Transaction Error', arguments);
      });
    });
  });
});