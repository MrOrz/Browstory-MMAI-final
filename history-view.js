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
  });

  // regenerate feature button
  //
  $('.regenerate').click(function(){
    if(!confirm('Are you sure to regenerate all feature?')){
      return false;
    }

    $.initDB.done(function(db){
      db.transaction(function(tx){
        tx.executeSql('SELECT id, url, screenshot FROM entry;', [], function(tx, results){
          var structure_feature, item, i;
          // for each existing entries
          //
          for (i = 0; i < results.rows.length; i+=1) {
            item = results.rows.item(i);
            console.log('Processing: ', item.url);
            (function(item){
              // create a closure because we want an image and canvas for each entry.
              //

              // load the image first
              var img = new Image(); // <img> to load screenshot in db
              img.onload = function(){
                var canvas = $('<canvas />').get(0);
                canvas.width = img.width; canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                // get new feature from item.screenshot
                //
                structure_feature = segmentation(canvas);
                tx.executeSql('UPDATE structure_feature SET structure_feature = ?, structure_screenshot WHERE id = ?',
                 [structure_feature, canvas.toDataURL(), item.id], function(){
                  console.error('Update Error', arguments);
                });
              }
              img.src = item.screenshot;
            }(item));
          }
        }, function(){
          console.error('Transaction Error', arguments);
        });
      });
    });
  });

}(chrome, document));
