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
    };

  // init script
  $(function(){
    $table = $('#tbody');

    // read all records
    //
    $.initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql('SELECT * FROM entry;', [], function(tx, results){
          var i, rows = [];
          for (i = 0; i < results.rows.length; i+=1) {
            rows.push(results.rows.item(i));
          }
          $('#rowTemplate').tmpl(rows, {getTime:getTime}).appendTo($('#tbody'));
          //$table.append(htmlStr);
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
        db.transaction(function(tx){
          tx.executeSql('DROP TABLE IF EXISTS entry;', [], function(tx, results){
            location.reload();
          });
        });

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
          structure_feature, structure_screenshot;

        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        // get new feature from item.screenshot
        //
        structure_feature = segmentation(canvas);
        structure_screenshot = structure_feature.canvas.toDataURL();
        structure_feature = JSON.stringify(structure_feature);

        $.initDB.done(function(db){
          db.transaction(function(tx){
            tx.executeSql('UPDATE structure_feature SET structure_feature = ?, structure_screenshot WHERE id = ?',
              [
                structure_feature,
                structure_screenshot, id
              ],
              function(){
                console.error('Update Error', arguments);
              }
            );
          });
        });

        // update table
        $tr.find('.structure-thumb, .structure-orig').attr('src', structure_screenshot);
        $tr.find('.structure-feature').text(structure_feature);
      });
      $('.done').show().delay(1000).fadeOut('slow');
      $(this).removeClass('processing');
    });

  });

}(chrome, document));
