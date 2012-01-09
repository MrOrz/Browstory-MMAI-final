// canvas.js
//
// handles the canvas $('#query')'s initialization and events.
// http://www.williammalone.com/articles/create-html5-canvas-javascript-drawing-app/
//

(function($, undefined){
  "use strict";
  // global variables to canvas.js
  var w, h,
      canvas, sliceCanvas, ctx, slicectx,
      rects, // containing rect
      canvasPosition;
      // end of global variables

  // HistRecord & HistRecordCollection class definition
  //
  var
  HistRecord = function(imageData, simageData, customRects){
    this.imageData  = imageData  || ctx.getImageData(0,0,w,h);
    this.simageData = simageData || slicectx.getImageData(0,0,w,h);
    this.rects =     customRects || rects.slice(0); // back up current rects
  },
  HistRecordCollection = function(){
    var _records = [];
    // pushing histRecord
    //
    this.push = function(histRecord){
      if(! histRecord instanceof HistRecord){
        console.error('Invalid entry to push');
      }
      _records.push(histRecord);
    };

    // pop last history record
    //
    this.pop = function(){
      if(_records.length){
        // pop the record and put the image data into current canvas
        var record = _records.pop();
        ctx.putImageData(record.imageData, 0, 0);
        slicectx.putImageData(record.simageData, 0, 0);
        rects = record.rects.slice(0);
        return record;
      }
    };

    // return the last record in stack
    //
    this.end = function(){
      return _records[_records.length-1];
    };
  };

  // global history
  var history = new HistRecordCollection();

  // global methods to canvas.js
  var
    drawLine = function(startX, startY, endX, endY){
      // ASSERT(imageDataHist[len-1] is the original canvas imageData)

      // put old image data
      slicectx.putImageData(history.end().simageData, 0, 0);

      // do the drawing
      slicectx.beginPath();
      slicectx.moveTo(startX, startY);
      slicectx.lineTo(endX, endY);
      slicectx.stroke();
      slicectx.closePath();
    },
    getOffset = function(e){
      var x = e.pageX - canvasPosition.left,
          y = e.pageY - canvasPosition.top - document.body.scrollTop,
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
    };
  // end of global methods



  // init script
  //
  $(function(){
    // populating variables global to canvas.js
    //
    canvas = $('#query').get(0);
    sliceCanvas = $('#slice').get(0);
    ctx = canvas.getContext('2d');
    slicectx = sliceCanvas.getContext('2d');

    w = canvas.width; h = canvas.height;
    canvasPosition = $('.canvas-container').offset();

    // initial rects
    rects = [{left: 0, top: 0, width: w, height: h}];

    // set context
    slicectx.lineJoin = "round"; slicectx.lineWidth = 2;

    // private variables used when drawing lines (mostly)
    var start, current,  // points returned by getOffset(e)
        tool = 'slice', // tool === $('.tool.selected').data('tool')
        vertical; // how start & current is positioned

    $(sliceCanvas).mousedown(function(e){
      // push the current image data into history
      //

      history.push(new HistRecord());

      // tool operations
      //
      if(tool === 'slice'){
        start = getOffset(e); // set start point
      }else if(tool === 'fill'){
        start = getOffset(e);
        ctx.fillStyle = $('.colorpicker').val();
        ctx.fillRect(start.rect.left, start.rect.top, start.rect.width, start.rect.height);
        start = null; // Drawing done.
        $(canvas).trigger('draw', [rects]);
      }

    }).mousemove(function(e){
      if(start && tool === 'slice'){
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
      if(start && current && tool === 'slice'){
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

    // clear canvas button
    $('.clear').click(function(){
      // reset the two canvas and the rects array
      ctx.clearRect(0,0,w,h);
      slicectx.clearRect(0,0,w,h);
      rects = [{left: 0, top: 0, width: w, height: h}];

      // push current state into history
      history.push(new HistRecord());
    });

    // undo canvas button
    $('.undo').click(function(){
      history.pop();
    });

    // initialize tools
    tool = $('.tool.selected').data('tool');
    $('.tool').click(function(){
      tool = $(this).data('tool');
      $('.tool').removeClass('selected');
      $(this).addClass('selected');
    });


    // initialize color picker
    $.fn.colorPicker.defaultColors = [
      // gray    0~67.5   90~157.5  180~247.5 270~337.5
      '222222', 'FF0000', '80FF00', '00FFFF', '7F00FF',
      '666666', 'FF6000', '20FF00', '009FFF', 'DF00FF',
      'AAAAAA', 'FFBF00', '00FF40', '0040FF', 'FF00BF',
      'EEEEEE', 'DFFF00', '00FF9F', '2000FF', 'FF0060'
    ];
    $('.colorpicker').colorPicker();
  });
}(jQuery))