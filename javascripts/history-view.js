/*global chrome, segmentation */
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
    },
    colorize = function(){ // colorize all color maps
      $('.colormap').find('span').each(function(){
        var color = parseFloat($(this).text(), 10);
        if(color <= 0){
          // 0, -1, -2, -3
          $(this).css('background', 'hsl(0,0%,' + (-33*color) + '%)');
          if(color >= -1){ // make font white if background is black
            $(this).css('color', '#fff');
          }
        }else{
          $(this).css('background', 'hsl('+(color)+', 100%, 50%)');
        }
      });
    };

  // init script
  $(function(){
    $table = $('#tbody');

    // read all records
    //
    $.initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql(
          'SELECT * FROM entry '+
          'LEFT JOIN structure ON entry.id=structure.entry_id '+
          'LEFT JOIN colormap ON entry.id=colormap.entry_id;',

          [], function(tx, results){
          var i, rows = [];
          for (i = 0; i < results.rows.length; i+=1) {
            rows.push(results.rows.item(i));
          }
          $('#rowTemplate').tmpl(rows, {getTime:getTime}).appendTo($('#tbody'));
          colorize();
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
        db.transaction(
          function(tx){
            tx.executeSql('DROP TABLE IF EXISTS entry;');
            tx.executeSql('DROP TABLE IF EXISTS structure;');
            tx.executeSql('DROP TABLE IF EXISTS colormap;');
          }, function(err){
            console.error('DROP TABLE error', err);
          }, function(tx, results){
            $('body').text('All tables dropped, please reload plugin to create table');
          }
        );
      });
    });

    // regenerate feature button
    //
    $('.regenerate').click(function(){
      $(this).addClass('processing');
      if(!confirm('Are you sure to regenerate all feature?')){
        $(this).removeClass('processing');
        return false;
      }

      $('.ss-orig').each(function(){
        // create new canvas to invoke segmentation()
        //
        var img = this,
          $tr = $(this).parents('tr'),
          id = $(this).data('id'),
          canvas = $('<canvas></canvas>').get(0),
          result, structure_screenshot,
          rect = $(this).data('rect');

        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        // get new feature from item.screenshot
        //
        result = segmentation(canvas, rect);
        structure_screenshot = result.canvas.toDataURL();

        $.initDB.done(function(db){
          db.transaction(function(tx){
            tx.executeSql('UPDATE entry SET structure_screenshot = ? WHERE id = ?',
              [structure_screenshot, id]
            );
            $.updatefv(tx, id, result.structure, result.colormap);
          },
            function(){ console.error('Update transaction error', arguments);}
          );
        });

        // update table
        $tr.find('.structure-thumb, .structure-orig').attr('src', structure_screenshot);
        $tr.find('.struct-fv').text(JSON.stringify(result.structure));

        var colorRow = {}, i;
        for(i=0; i<result.colormap.length; i+=4){
          colorRow['a'+i/4] = result.colormap[i];
          colorRow['b'+i/4] = result.colormap[i+1];
          colorRow['c'+i/4] = result.colormap[i+2];
          colorRow['d'+i/4] = result.colormap[i+3];
        }
          $tr.find('.colormap').empty().append($('#colormapTemplate').tmpl([colorRow]));
      }); // end of each '.ss-orig'
      colorize();
      $('.done').show().delay(1000).fadeOut('slow');
      $(this).removeClass('processing');
    });

  });

}(chrome, document));
