/*global chrome */
/*
 * watchr.js
 *
 * injected content script
 *
*/
(function(window, document, undefined){
  "use strict";
  var
    blacklist = 'script,meta,embed,link,object', // HTML elements to ignore
    bodyWidth = $('body').innerWidth(),

    // Recursively find container element.
    // An element is called 'container' if its direct parent
    // node has width >= bodyWidth and itself containing elements.
    //
    findContainer = function($root){
      var
        // select non-empty, non-blacklist children
        $children = $root.children().not(blacklist).filter(function(){
          return $(this).children().not(blacklist).length > 0;
        }),
        possibleContainers = [], ret = {};

      // traversing current element's children if they are the parent of
      // a container
      //
      $children.each(function(){
        var $child = $(this), container;
        // the container should reside on elements whose width >= bodyWidth.
        // so use this child as root to find Container.
        if($child.width() >= bodyWidth){
          container = findContainer($child);
          if(!$.isEmptyObject(container)){
            possibleContainers.push(container);
          }
        }
      })

      // If no possible containers (maybe all children's width < bodyWidth)
      // then we make all children be a possible container
      //
      if(possibleContainers.length === 0){
        $children.each(function(){
          possibleContainers.push($(this));
        });
      }

      // Pick the best (=widest) container here.
      //

      ret._width = 0;
      $.each(possibleContainers, function(){
        // possibleContainers is already an array of jQuery obj
        var $elem = this;
        if($elem.width() > ret._width){
          ret = $elem;
          ret._width = $elem.width();
        }
      });
      delete ret._width;
      return ret;
    },
    initTime = Date.now();

  // traversing DOM structure to get the root of contents
  console.log('container found:', findContainer($('body')));

  // content script runs at document_idle
  chrome.extension.sendRequest({"time": initTime}, function(response) {
    console.log("Request send");
  });
}(window, document));
