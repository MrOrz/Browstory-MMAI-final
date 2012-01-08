// canvas.js
//
// handles the canvas $('#query')'s initialization and events.
// http://www.williammalone.com/articles/create-html5-canvas-javascript-drawing-app/
//

(function($, undefined){
  "use strict";
  var w,h,imageData,
      canvas, ctx,
      /*
        @param x, y Starting coordinate
        @param color The color to fill, in the format of [R,G,B]
      */
      floodfill = function(x, y, color){
        var filled = false,
            bfsQueue = [{r:y, c:x}];
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
            imageData.data[coord.r*4*w+coord.c*4+i] = color[i];
          }
          filled = true;
          imageData.data[coord.r*4*w+coord.c*4+3] = 255;
        }
        if(filled){
          ctx.putImageData(imageData, 0, 0);
        }
        return filled;
      };

  // init script
  //
  $(function(){
    var painting = false;
    canvas = $('#query').get(0);
    ctx = canvas.getContext('2d');
    w = canvas.width; h = canvas.height;
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
        // Draw complete. Trigger the handler
        $(canvas).trigger('draw');

      }

    });
  });
}(jQuery))