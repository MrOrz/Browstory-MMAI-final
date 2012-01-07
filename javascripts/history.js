/*global chrome */
/* history.js for history.html */

$(function(){
  "use strict";
  var
    $tmpl = $('#itemTemplate'),
    $recentTarget = $('#recent-target'),
    $searchTarget = $('#search-target'),
    $empty = $tmpl.tmpl({}),
    recentItems, searchResults, // caches items for redraw
    itemCount, // counting how many items in a row
    largeCount, smallCount, tinyCount,
    // testing item width and populating *Count.
    //
    measure = function(){
      itemCount = Math.floor($recentTarget.width() / $empty.outerWidth(true));
      $empty.addClass('large');
      largeCount = Math.floor($recentTarget.width() / $empty.outerWidth(true)); $empty.removeClass('large');
      $empty.addClass('small');
      smallCount = Math.floor($recentTarget.width() / $empty.outerWidth(true)); $empty.removeClass('small');
      $empty.addClass('tiny');
      tinyCount = Math.floor($recentTarget.width() / $empty.outerWidth(true)); $empty.removeClass('tiny');
    },
    // determines the size of item by returning the corresponding class name
    itemClass = function(idx){
      if(idx < largeCount){
        return 'large';
      }else if(idx < largeCount + itemCount){
        return 'normal'; // unstyled; normal style.
      }else if(idx < largeCount + itemCount + smallCount * 2){
        return 'small';
      }else{
        return 'tiny';
      }
    },
    insertBr = function($target){
      var lastClassName = 'item large';
      $target.remove('br').find('.item').each(function(){
        if(this.className !== lastClassName){
          lastClassName = this.className;
          $('<br />').insertBefore(this);
        }
      });
    };

  $empty.appendTo($('#hidden'));
  measure();

  // show recent
  $.initDB.done(function(db){
    db.readTransaction(function(tx){
      // clean up target
      $recentTarget.empty();

      tx.executeSql('SELECT * FROM entry ORDER BY lastview DESC;',
      [], function(tx, results){
        recentItems = $.getItems(results); // populate cache with search result
        $tmpl.tmpl(recentItems).each(function(idx){
          $(this).addClass(itemClass(idx));
        }).appendTo($recentTarget);
        insertBr($recentTarget);
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
              $searchTarget.empty().append($tmpl.tmpl($.getItems(results)));
            });
          },function(){
            console.error('read transaction error on search', arguments);
          });
        });
      });
    }, 200);
  });
  $(window).resize(function(){
    // recalculate *counts and render the elements again
    measure();
    var last_cls = 'large';
    $recentTarget.children('br').remove().end()
     .find('.item').each(function(idx){
      var $item = $(this), cls = itemClass(idx);
      if(!$item.hasClass(cls)){
        $item.removeClass('large normal small tiny').addClass(cls);
      }
    });
    insertBr($recentTarget);
  })
});