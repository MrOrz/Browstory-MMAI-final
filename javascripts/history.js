/*global chrome, segmentation */
/* history.js for history.html */

$(function(){
  "use strict";
  var
    $tmpl = $('#itemTemplate'),
    $recentTarget = $('#recent-target'),
    $searchTarget = $('#search-target'),
    $empty = $tmpl.tmpl({}),
    canvas = $('#query').get(0),
    recentItems, searchResults, // caches items for redraw
    itemCount, // counting how many items in a row
    largeCount, smallCount, tinyCount,
    queryURLs = [], // whether we are querying with urls
    canvasResult = null, // whether we are querying with canvas
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

  // init show recent
  //
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

  // prevent form submission
  //
  $('form').submit(function(e){e.preventDefault(); return; })

  // search handler
  //
  var searchDfd = $.Deferred(), search_handler;
  $('.keyword').keydown(function(){
    if(search_handler){
      clearTimeout(search_handler);
    }
    var $this = $(this);
    search_handler = setTimeout(function(){
      $searchTarget.empty();
      chrome.history.search({text: $this.val()}, function(results){
        queryURLs = $.map(results, function(hisItem){return '"' + hisItem.url + '"'}).join(',');
        if(queryURLs.length){
          if(canvasResult){
            // do URL-Canvas search
            $.query(canvasResult.structure, canvasResult.colormap, queryURLs).done(function(items){
              $searchTarget.append($tmpl.tmpl(items));
            });
          }else{
            // just do URL search & cache
            $.queryByURLs(queryURLs).done(function(items){
              $searchTarget.append($tmpl.tmpl(items));
            });
          }
        }
      });
    }, 200);
  });

  // window resize handler
  //
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
  });

  // canvas draw complete event handler
  $(canvas).on('draw', function(e, rect){
    $searchTarget.empty();
    var tmpCanvas = $('<canvas>').get(0);
    tmpCanvas.width = canvas.width; tmpCanvas.height = canvas.height;
    tmpCanvas.getContext('2d').putImageData(
      canvas.getContext('2d').getImageData(0, 0,canvas.width, canvas.height),0,0
    );

    var result = segmentation(tmpCanvas, rect);
    //$(result.canvas).insertAfter($('#slice')).show().delay(1000).hide('slow', function(){$(this).remove()});

    $.query(result.structure, result.colormap, queryURLs).done(function(items){
      $searchTarget.append($tmpl.tmpl(items));
    });

    // save the result here.
    canvasResult = result;
  });

  $('.clear').click(function(){
    canvasResult = null; // unset canvasResult
  })
});