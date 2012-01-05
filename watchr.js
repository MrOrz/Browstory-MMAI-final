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
    $body = $('body'), $container,
    bodyWidth = $body.innerWidth(),
    bodyArea = $body.width() * $body.height(),

    // Recursively find container element.
    // An element is called 'container' if its direct parent
    // node has width >= bodyWidth and itself containing elements.
    //
    findContainer = function($root){
      var
        // Select non-empty, non-blacklist, large-area children.
        // 'large-area' is defined by its area portion to the entire body.
        // > 20% is considered 'large area'.
        $children = $root.children().not(blacklist).filter(function(){
          var $this = $(this);
          return (
            $this.width() * $this.height() > 0.2 * bodyArea &&
            $this.children().not(blacklist).length > 0 // emptiness check
          );
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

      //console.log('possible containers of', $root, 'is', possibleContainers);

      // Pick the best (=widest) container here.
      //

      ret._area = 0;
      $.each(possibleContainers, function(){
        // possibleContainers is already an array of jQuery obj
        var $elem = this, area = $elem.width() * $elem.height();
        if(area > ret._area){
          ret = $elem;
          ret._area = area;
        }
      });
      delete ret._area;

      // if no container is found when recursion backs to body,
      // make the body itself the container
      //
      if($.isEmptyObject(ret) && $root === $body){
        ret = $body;
      }
      return ret;
    },
    initTime = Date.now();

  // traversing DOM structure to get the root of contents
  // console.log('container found:', findContainer($body));
  $container = findContainer($body);

  // content script runs at document_idle
  chrome.extension.sendRequest({
    "time": initTime,
    "left": $container.position().left,
    "width": $container.width()
  }, function(response) {
    console.log("Request send");
  });
}(window, document));
