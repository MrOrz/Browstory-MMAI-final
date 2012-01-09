/*global Sha1 */
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
    DB_SIZE = 50 * 1024 * 1024, // 10MB database
    initialized = false,
    db, // database connection
    tempSName = function (S){
      var ret = "S";
      $.each(S, function(){
        ret += this;
      });
      return ret;
    },
    tempCName = function (C){
      var ret = "C";
      $.each(C, function(){
        var num = this;
        if(num === null){
          ret += 'N';
          return; // continue
        }
        if(num > 0){
          num /= 22.5; // 1~16
        }
        // num is now -3~16 here.
        ret += (num+3).toString(20);
      });
      return ret;
    },
    tempURLName = function(urls){
      return "U" + Sha1.hash(JSON.stringify(urls)).substr(0,16);
    };

  // The variable db must be guarded because even though openDatabase() method
  // is synchronous, its database creation callback is not.
  // If the table is not created before it is selected, errors would
  // occur.
  //
  // reference: http://goo.gl/QAIUE
  //
  //
  $.initDB = (function(){
    var
      dfd = $.Deferred();
    db = db || openDatabase('link-recording', DB_VERSION, 'link recording', DB_SIZE);
    if(!initialized){
      console.log('database init');
      db.transaction(
        function(tx){ // transaction callback
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
              's5 INTEGER NOT NULL,' +
              'FOREIGN KEY(entry_id) REFERENCES entry(id)' +
            ');'
          );
          tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS structure_idx ON structure(entry_id);');

          var i, query = [];
          // a0 b0 c0 d0 a1 b1 c1 d1 ...... a8 b8 c8 d8.
          for(i = 0; i<9; i+=1){
            query.push('a'+i+' BOOLEAN NOT NULL,' +
                       'b'+i+' BOOLEAN NOT NULL,' +
                       'c'+i+' BOOLEAN NOT NULL,' +
                       'd'+i+' BOOLEAN NOT NULL,');
          }
          tx.executeSql(
            'CREATE TABLE IF NOT EXISTS colormap(' +
              'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,' +
              'entry_id INTEGER NOT NULL,'+
              query.join('') +
              'FOREIGN KEY(entry_id) REFERENCES entry(id)' +
            ');'
          );
          tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS colormap_idx ON colormap(entry_id);');
        }, function(e){ // transaction error callback
          console.error('DB Creation Error', e);
          dfd.reject(e);
        }, function(results){ // transaction success callback
          initialized = true;
          console.log('...database initialized.');
          dfd.resolve(db);
        }
      );
    }else{ // database already initialized.
      dfd.resolve(db);
    }
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
    tx.executeSql(
      'INSERT OR REPLACE INTO colormap (entry_id, ' + query.join(', ') + ') values (?, ' +
      (new Array(36)).join('?, ') + '?);',[id].concat(C)
    );
  };

  // callback used by $.queryBy*
  //
  var createTempCallback = function(tx, dfd, tempName, column, queryOnly){
    if(queryOnly){
      dfd.resolve(tempName);
    }else{
      tx.executeSql(
        'SELECT entry.*, '+column+' AS sim FROM ' + tempName +
        ' LEFT JOIN entry ON entry.id = entry_id ORDER BY sim DESC;',
        [], function(tx, results){
          dfd.resolve($.getItems(results));
        }
      );
    }
  };

  // @params S: 6-dimension structure feature vector
  // @params queryOnly: if true, only the table name is sent to done callback
  //
  $.queryByStructure = function(S, queryOnly){
    var dfd = $.Deferred(),
        tempName = tempSName(S);
    //console.log('tempSname:', tempName);

    $.initDB.done(function(db){
      db.transaction(function(tx){
        // create temp table to hold the structure query result
        tx.executeSql(
          'CREATE TEMP TABLE IF NOT EXISTS ' + tempName + ' AS '+
          'SELECT entry_id, COUNT(entry_id) AS s_sim FROM (' +
            'SELECT entry_id FROM structure WHERE s0 = ? UNION ALL ' +
            'SELECT entry_id FROM structure WHERE s1 = ? UNION ALL ' +
            'SELECT entry_id FROM structure WHERE s2 = ? UNION ALL ' +
            'SELECT entry_id FROM structure WHERE s3 = ? UNION ALL ' +
            'SELECT entry_id FROM structure WHERE s4 = ? UNION ALL ' +
            'SELECT entry_id FROM structure WHERE s5 = ?' +
          ') GROUP BY entry_id ORDER BY s_sim DESC;',
          S, // SQL parameters = S, the array of structure features.
          function(){
            createTempCallback(tx, dfd, tempName, 's_sim', queryOnly)
          }
        );
      }, function(){
        console.error('structure query error', arguments);
      });
    });
    return dfd.promise();
  };

  // @params C: 36-dimension color feature vector
  // @params queryOnly: if true, only the table name is sent to done callback
  //
  $.queryByColormap = function(C, queryOnly){
    var dfd = $.Deferred(),
      query = [], // the list of SELECT statements, one per non-transparent area.
      params = [], // SQL parameters
      i,
      tempName = tempCName(C);

    //console.log('tempCname:', tempName);
    for(i=0; i<C.length; i+=4){
      var idx = i/4;
      // Only the 1st dominant color is used.
      // quantized dominant color should be C[i] and C[i+1].
      if(C[i]!==null){ // if not transparent
        query.push('SELECT entry_id FROM colormap WHERE ' +
                   'a'+idx+'=? OR b'+idx+'=? OR c'+idx+'=? OR d'+idx+'=? ');
        params.push(C[i], C[i+1], C[i], C[i+1]);
      }
    }

    if(query.length === 0){
      if(queryOnly){
        dfd.resolve(false);
      }else{
        dfd.resolve([]);
      }
      return dfd.promise();
    }

    $.initDB.done(function(db){
      db.transaction(function(tx){
        tx.executeSql(
          'CREATE TEMP TABLE IF NOT EXISTS ' + tempName + ' AS '+
          'SELECT entry_id, COUNT(entry_id) AS c_sim FROM (' +
            query.join('UNION ALL ') +
          ') GROUP BY entry_id ORDER BY c_sim DESC;',
          params, // SQL parameters
          function(){
            createTempCallback(tx, dfd, tempName, 'c_sim', queryOnly)
          }
        );
      }, function(){
        console.error('color query error', arguments)
      });
    });
    return dfd.promise();
  };

  $.queryByURLs = function(urls, queryOnly){
    var dfd = $.Deferred(),
        tempName

    if(!urls || urls.length === 0){
      dfd.resolve(false);
      return dfd.promise();
    }

    tempName = tempURLName(urls);
    $.initDB.done(function(db){
      /*console.log('CREATE TEMP TABLE IF NOT EXISTS ' + tempName + ' AS '+
          'SELECT id AS entry_id FROM entry WHERE url IN ('+ urls + ') ORDER BY lastview DESC;');*/
      db.transaction(function(tx, results){
        tx.executeSql
        (
          'CREATE TEMP TABLE IF NOT EXISTS ' + tempName + ' AS '+
          'SELECT id AS entry_id FROM entry WHERE url IN ('+ urls + ') ORDER BY lastview DESC;',
          [], function(){
            createTempCallback(tx, dfd, tempName, 'lastview', queryOnly)
          }
        );
      },function(){
        console.error('url query error', arguments);
      });
    });
    return dfd.promise();
  }

  // -------------------------------------------------
  // -------------------------------------------------
  // -------------------------------------------------

  $.query = function(S, C, URLs){
    var dfd = $.Deferred();
    $.when($.initDB,
           $.queryByStructure(S, true),
           $.queryByColormap(C, true),
           $.queryByURLs(URLs, true)).done(function(db, sname, cname, uname){
      console.log('Querying ', sname, cname);

      // sname cannot be false, since the case that only uname != false
      // should be covered by direct invoke of $.queryByURLs
      //
      if(uname === false && cname === false){ // all transparent, skip color similarity
        // query structrue again, this time do the query.
        console.log('Structure-only search ======');

        $.queryByStructure(S).done(function(items){
          dfd.resolve(items);
        });
      }else if(uname !== false && cname === false){
        // mix up URL results with structure results
        console.log('URL-Structure search ======');

        db.readTransaction(function(tx){
          tx.executeSql(
            'SELECT entry.*, s_sim AS sim FROM '+ uname +
              ' LEFT JOIN '+sname+' USING (entry_id)'+
              ' LEFT JOIN entry ON '+uname+'.entry_id=entry.id '+
            'ORDER BY sim DESC;', [],
            function(tx, results){
              dfd.resolve($.getItems(results));
            }
          );
        },function(){
          console.error('query error', arguments)
        }); // end of readTransaction
      }else if(uname === false && cname !== false){
        // mix the two temp table to get the similarity, and left join the entry
        console.log('Structure-Color search ======');

        db.readTransaction(function(tx){
          tx.executeSql(
            'SELECT entry.*, 3*s_sim+2*(c_sim NOTNULL) AS sim '+
            'FROM '+sname+' LEFT OUTER JOIN '+cname+' USING (entry_id) '+
                           'LEFT JOIN entry ON '+sname+'.entry_id = entry.id '+
            'ORDER BY sim DESC;', [],
            function(tx, results){
              dfd.resolve($.getItems(results));
            }
          );
        }, function(){
          console.error('query error', arguments);
        }); // end of readTransaction
      }else{ // uname !== false, cname !== false
        // mix the three temp table to get the similarity
        console.log('URL-Structure-Color search ======');

        db.readTransaction(function(tx){
          tx.executeSql(
            'SELECT entry.*, 3*s_sim+2*(c_sim NOTNULL) AS sim '+
            'FROM '+uname+' LEFT JOIN '+sname+ ' USING (entry_id) '+
                           'LEFT OUTER JOIN '+cname+' USING (entry_id) '+
                           'LEFT JOIN entry ON '+sname+'.entry_id = entry.id '+
            'ORDER BY sim DESC;', [],
            function(tx, results){
              dfd.resolve($.getItems(results));
            }
          );
        }, function(){
          console.error('query error', arguments);
        }); // end of readTransaction
      }
    });
    return dfd.promise();
  };

}(window.openDatabase));
