/*
 * db.js
 *
 * Declaring $.initDB deferred object, which provides db in the done callback.
 *
*/
(function(openDatabase, undefined){
  "use strict";
  var
    // constants
    DB_VERSION = "0.1",
    DB_SIZE = 50 * 1024 * 1024; // 10MB database

  // The variable db must be guarded because even though openDatabase() method
  // is synchronous, its database creation callback is not.
  // If the table 'entry' is not created before it is selected, errors would
  // occur.
  //
  // reference: http://goo.gl/QAIUE
  //
  //
  $.initDB = (function(){
    var
      dfd = $.Deferred(),
      db = openDatabase('link-recording', DB_VERSION, 'link recording', DB_SIZE);

    // console.log('database init');

    db.transaction(function(tx){
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS entry(' +
          'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
          'url TEXT NOT NULL,' +
          'title TEXT,' +
          'screenshot TEXT,' +
          'structure_screenshot TEXT,' +
          'timestamp INTEGER,' +
          'rect TEXT,' +
          'visits INTEGER DEFAULT 0,' +
          'lastview INTEGER DEFAULT 0,' +
            // updated even on tab switching! Different from HistoryItem's lastVisited
          'active INTEGER DEFAULT 0' +
        ');'
      );
      tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS entry_idx ON entry(url);');

      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS structure(' +
          'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
          'entry_id INTEGER NOT NULL,' +
          's0 INTEGER NOT NULL,' +
          's1 INTEGER NOT NULL,' +
          's2 INTEGER NOT NULL,' +
          's3 INTEGER NOT NULL,' +
          's4 INTEGER NOT NULL,' +
          's5 INTEGER NOT NULL ' +
        ');'
      );
      tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS structure_idx ON structure(entry_id);');

      var i, query = [];
      // a0 b0 c0 d0 a1 b1 c1 d1 ...... a8 b8 c8 d8.
      for(i = 0; i<9; i+=1){
        query.push('a'+i+' BOOLEAN NOT NULL, ' +
                   'b'+i+' BOOLEAN NOT NULL, ' +
                   'c'+i+' BOOLEAN NOT NULL, ' +
                   'd'+i+' BOOLEAN NOT NULL');
      }
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS colormap(' +
          'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
          'entry_id INTEGER NOT NULL,' +
          'color INTEGER NOT NULL,' +
          query.join(', ') +
        ');'
      );
      tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS colormap_idx ON colormap(entry_id, color);');

    }, [], function(results){
      // transaction success callback
      dfd.resolve(db);
    }, function(tx, e){
      // transaction error callback
      console.error('DB Creation Error', e);
      dfd.reject(e);
    });

    return dfd.promise();
  }());

  // utility function that returns query results as javascript array.
  //
  $.getItems = function(results){
    var i, items = [];
    for (i = 0; i < results.rows.length; i+=1) {
      items.push(results.rows.item(i));
    }
    return items;
  }

  /*
    @param tx: transaction object
    @param id: database entry id to update
    @param S) structure feature vector (6-d)
    @param C: colormap feature vector (9x4=36 dimensions)
    @param callback: optional.
  */
  $.updatefv = function(tx, id, S, C){
    tx.executeSql(
      'INSERT OR REPLACE INTO structure (entry_id, s0, s1, s2, s3, s4, s5) values (?,?,?,?,?,?,?);',
      [id].concat(S)
    );
    var query = [], i;
    for(i=0; i<9; i+=1){
      query.push('a'+i+', b'+i+', c'+i+', d'+i);
    }
    console.log('INSERT OR REPLACE INTO colormap (entry_id, ' + query.join(', ') + ') values (?, ' +
      (new Array(36)).join('?, ') + '?);');
    /*
    tx.executeSql(
      'INSERT OR REPLACE INTO colormap (entry_id, ' + query.join(', ') + ') values (?, ' +
      Array(36).join('?, ') + '?);',[id].concat(C)
    );*/
  };

  // @params S: 6-dimension structure feature vector
  //
  $.queryByStructure = function(S){
    var dfd = $.Deferred();
    $.initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql(
          // TODO: join entry table on the outer SELECT!
          'SELECT entry_id, COUNT(entry_id) FROM (' +
            'SELECT entry_id FROM structure WHERE s0 = ? UNION ALL' +
            'SELECT entry_id FROM structure WHERE s1 = ? UNION ALL' +
            'SELECT entry_id FROM structure WHERE s2 = ? UNION ALL' +
            'SELECT entry_id FROM structure WHERE s3 = ? UNION ALL' +
            'SELECT entry_id FROM structure WHERE s4 = ? UNION ALL' +
            'SELECT entry_id FROM structure WHERE s5 = ?' +
          ') GROUP BY entry_id ORDER BY 2;',
          S, // SQL parameters = S, the array of structure features.
          function(tx, results){
            dfd.resolve($.getItems(results));
          }
        );
      });
    });
    return dfd.promise();
  };

  $.queryByColormap = function(C){
    var dfd = $.Deferred(),
      query = [], // the list of SELECT statements, one per non-transparent area.
      params = []; // SQL parameters
    $.each(C, function(idx, qc){
      // qc: query color.
      if(qc){
        var i = Math.floor(idx/4);
        // i is the area number.
        query.push('SELECT entry_id FROM colormap WHERE ' +
                   'a'+i+'=? OR b'+i+'=? OR c'+i+'=? OR d'+i+'=? ');
        params.push(qc);
      }
    })
    $.initDB.done(function(db){
      db.readTransaction(function(tx){
        tx.executeSql(
          // TODO: join entry table on the outer SELECT!
          'SELECT entry_id, COUNT(entry_id) FROM (' +
            query.join('UNION ALL ') +
          ') GROUP BY entry_id ORDER BY 2;',
          params, // SQL parameters
          function(tx, results){
            dfd.resolve($.getItems(results));
          }
        );
      });
    });
    return dfd.promise();
  };

}(window.openDatabase));
