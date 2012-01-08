/*global chrome, segmentation */
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

  // setting canvas
  // http://www.williammalone.com/articles/create-html5-canvas-javascript-drawing-app/
  //
  var painting = false,
      canvas = $('#query').get(0),
      canvas2 = $('#filled').get(0),
      ctx = canvas.getContext('2d');

  ctx.lineJoin = "round"; ctx.lineWidth = 3;
  $(canvas).mousedown(function(e){
    painting = true;
    ctx.beginPath();
    ctx.moveTo(e.pageX - this.offsetLeft, e.pageY - this.offsetTop - document.body.scrollTop);
  }).mousemove(function(e){
    if(painting){
      ctx.lineTo(e.pageX - this.offsetLeft, e.pageY - this.offsetTop - document.body.scrollTop);
      ctx.stroke();
    }
  }).on('mouseup mouseleave', function(){
    if(painting){
      painting = false;
      ctx.closePath();

      // start searching
      //
      var ctx2 = canvas2.getContext('2d'),
          w = canvas2.width, h = canvas2.height,
          imageData,
          r, c,
          fillPixel = [0,0,0,255,0,255,255,0,255],
          bfsQueue = [],
          bfs = function(){
            var filled = false;
            while(bfsQueue.length > 0){
              // console.log('bfs:', bfsQueue[0].r, bfsQueue[0].c);
              var coord = bfsQueue.shift();
              // if current step not transparent, return.
              if(imageData.data[coord.r*4*w+coord.c*4+3] !== 0){
                continue;
              }

              // push surrounding pixels into queue
              if(coord.r-1 >= 0){bfsQueue.push({r: coord.r-1, c: coord.c});}
              if(coord.r+1 < h){bfsQueue.push({r: coord.r+1, c: coord.c});}
              if(coord.c-1 >= 0){bfsQueue.push({r: coord.r, c: coord.c-1});}
              if(coord.c+1 < w){bfsQueue.push({r: coord.r, c: coord.c+1});}

              // draw current pixel
              for(var i=0; i<3; ++i){
                imageData.data[coord.r*4*w+coord.c*4+i] = fillPixel[i];
              }
              filled = true;
              imageData.data[coord.r*4*w+coord.c*4+3] = 255;
            }
            return filled;
          };

      ctx2.clearRect(0,0,w,h);
      ctx2.drawImage(canvas, 0, 0);
      imageData = ctx2.getImageData(0, 0, w, h);
      for(r=0; r<h; r+=1){
        for(c=0; c<w; c+=1){
          bfsQueue.push({r:r, c:c});
          if(bfs()){ // some pixels filled

            // cycle the color
            var leftmost = fillPixel.shift();
            fillPixel.push(leftmost);
          }
        }
      }
      // refresh ctx2
      ctx2.putImageData(imageData, 0, 0);

      var tmpCanvas = $('<canvas>').get(0);
      tmpCanvas.width = w; tmpCanvas.height = h;
      tmpCanvas.getContext('2d').putImageData(imageData,0,0);
      var result = segmentation(tmpCanvas, []);
      $(result.canvas).insertAfter(canvas2);

      // query using structure
      $.queryByStructure(result.structure).done(function(items){
        console.log('structure query result:', items);
        $searchTarget.empty().append($tmpl.tmpl(items));
      });
    }

  });

  $('.clear-query').click(function(){
    ctx.clearRect(0,0,canvas.width, canvas.height);
  })
});