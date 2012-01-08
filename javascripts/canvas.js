// canvas.js
//
// handles the canvas $('#query')'s initialization and events.
// http://www.williammalone.com/articles/create-html5-canvas-javascript-drawing-app/
//

(function($, undefined){
  "use strict";
  var w, h, imageData, imageDataHist = [], // imageData history
      canvas, ctx,
      rects, // containing rect
      getOffset = function(e){
        var x = e.pageX - canvas.offsetLeft,
            y = e.pageY - canvas.offsetTop - document.body.scrollTop,
            rectIdx;
        // off-canvas correction
        x = (x<0?0:(x>w?w:x)); y = (y<0?0:(y>h?h:y));

        $.each(rects, function(idx){
          if(this.left <= x && this.top <= y &&
             this.left + this.width >= x && this.top + this.height >= y){
            rectIdx = idx;
            return false;
          }
        });
        return {
          x: x,
          y: y,
          rectIdx: rectIdx,
          rect: rects[rectIdx]
        };
      },
      drawLine = function(startX, startY, endX, endY){
        // ASSERT(imageDataHist[len-1] is the original canvas imageData)

        // put old image data
        ctx.putImageData(imageDataHist[imageDataHist.length-1], 0, 0);

        // do the drawing
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.closePath();
      };

  // init script
  //
  $(function(){
    // populating variables global to canvas.js
    //
    canvas = $('#query').get(0);
    ctx = canvas.getContext('2d');
    w = canvas.width; h = canvas.height;
    rects = [{left: 0, top: 0, width: w, height: h}];

    // set context
    ctx.lineJoin = "round"; ctx.lineWidth = 2;

    // private variables used when drawing lines (mostly)
    var start, current,  // points returned by getOffset(e)
        filling = false, // tool selection, false => drawing lines
        vertical; // how start & current is positioned

    $(canvas).mousedown(function(e){
      start = getOffset(e); // set start point

      // push the current image data into history
      //
      imageDataHist.push(ctx.getImageData(0,0,w,h));
    }).mousemove(function(e){
      if(start && !filling){
        // set private variables
        //
        current = getOffset(e);
        vertical = Math.abs((current.y-start.y)/(current.x-start.x)) >= 1;

        if(vertical){
          drawLine(start.x, start.rect.top,
                   start.x, start.rect.top + start.rect.height);
        }else{
          drawLine(start.rect.left, start.y,
                   start.rect.left + start.rect.width, start.y);
        }
      }
    }).on('mouseup mouseleave', function(){
      if(start && current && !filling){
        // divide the rects into two
        var target = start.rect, idx = start.rectIdx;
        if(vertical){
          rects.splice(
            idx, 1,
            // vertical cut divides the rect horizontally.
            {
              left:   target.left,
              top:    target.top,
              width:  start.x - target.left,
              height: target.height
            },{
              left:   start.x,
              top:    target.top,
              width:  target.left + target.width - start.x,
              height: target.height
            }
          );
        }else{
          rects.splice(
            idx, 1,
            // horizontal cut divides the rect vertically.
            {
              left:   target.left,
              top:    target.top,
              width:  target.width,
              height: start.y - target.top
            },{
              left:   target.left,
              top:    start.y,
              width:  target.width,
              height: target.top + target.height - start.y
            }
          );
        }

        // Reset variables related to poings,
        // since their rect & rectIdx will be invalid after rect division.
        start = current = null;

        // Draw complete. Trigger the handler
        /*console.log(rects);
        $.each(rects, function(){
          ctx.fillStyle = "#"+((1<<24)*Math.random()|0).toString(16);
          ctx.fillRect(this.left, this.top, this.width, this.height);
        })*/
        $(canvas).trigger('draw', [rects]);
      }

    });

    $('.clear-query').click(function(){
      canvas.getContext('2d').clearRect(0,0,canvas.width, canvas.height);
      rects = [{left: 0, top: 0, width: w, height: h}];
      imageDataHist = [];
    });
  });
}(jQuery))