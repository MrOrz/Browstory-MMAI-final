/*global chrome */
/* history.js for history.html */

$(function(){
  "use strict";
  var
    $tmpl = $('#itemTemplate'),
    $recent_target = $('#recent-target'),
    $search_target = $('#search-target'),
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
        $tmpl.tmpl($.getItems(results)).appendTo($recent_target);
      }, function(){
        console.error('Read Transaction Error', arguments);
      });
    });
  });

  $('form').submit(function(e){e.preventDefault(); return; })

  var searchDfd = $.Deferred(), search_handler;
  $('.keyword').keydown(function(){
    if(search_handler){
      clearTimeout(search_handler);
    }
    var $this = $(this);
    search_handler = setTimeout(function(){
      chrome.history.search({text: $this.val()}, function(results){
        var urls = $.map(results, function(hisItem){return '"' + hisItem.url + '"'}).join(',');
        $.initDB.done(function(db){
          db.readTransaction(function(tx, results){
            console.log('SELECT * FROM entry WHERE url IN ('+ urls + ') ORDER BY lastview DESC;');
            tx.executeSql('SELECT * FROM entry WHERE url IN ('+ urls + ') ORDER BY lastview DESC;', 
            [], function(tx, results){
              $search_target.empty().append($tmpl.tmpl($.getItems(results)));
            });
          },function(){
            console.error('read transaction error on search', arguments);
          });
        });
      });
    }, 200);
  })
});