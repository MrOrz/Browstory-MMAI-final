/* history.js for history.html */

$(function(){
  "use strict";
  var
    $tmpl = $('#itemTemplate'),
    $recent_target = $('#recent-target'),
    $empty = $tmpl.tmpl({}),
    itemCount; // counting how many items in a row

  // testing item width
  //
  $empty.appendTo($('#hidden'));
  itemCount = Math.floor($recent_target.width() / $empty.outerWidth(true));

  $.initDB.done(function(db){
    db.readTransaction(function(tx){
      // clean up target
      $recent_target.empty();

      tx.executeSql('SELECT * FROM entry ORDER BY lastview DESC LIMIT ?;',
      [itemCount], function(tx, results){
        var i, htmlStr = "", items = [];
        for (i = 0; i < results.rows.length; i+=1) {
          items.push(results.rows.item(i));
        }
        $tmpl.tmpl(items).appendTo($recent_target);
      }, function(){
        console.error('Read Transaction Error', arguments);
      });
    });
  });
});