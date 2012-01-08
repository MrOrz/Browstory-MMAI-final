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
    childrenFilter, // function that determines whether to count $child as $root's child.
    containsContainer, // function that determines whether an element is possible to contain a container

    // Recursively find container element.
    // An element is called 'container' if its direct parent
    // node has width >= bodyWidth and itself containing elements.
    //
    // This recursion function requires childrenFilter() and containsContainer() to be set!
    //
    findContainer = function($root){
      var
        // Select non-empty, non-blacklist, large-area children.
        //
        $children = $root.children().not(blacklist).filter(function(){
          var $this = $(this);
          return (
            childrenFilter($root, $this) &&
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
        if(containsContainer($root, $child)){
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
    containers = [], // the containers to send to background
    initTime = Date.now(); // end of var statement

  // traversing DOM structure to get the root of contents
  // console.log('container found:', findContainer($body));
  // 'large-area' is defined by its area portion to the entire body.
  // > 100000 px^2 (100x1000 or 300 * 333) is considered 'large area'.
  //
  // Reasonable absolute pixel area is chosen here instead of ratio because
  // coverage ratios will change on different screen resolutions.
  childrenFilter = function($root, $child){
    return ($child.innerWidth() * $child.innerHeight() > 100000);
  };
  containsContainer = function($root, $child){
    return ($child.innerWidth() >= bodyWidth);
  };
  $container = findContainer($body);
  console.log('container: ', $container);
  containers.push({
    left: $container.offset().left,
    top: $container.offset().top,
    width: $container.innerWidth(),
    height: $container.innerHeight()
  });

  // Find sub-areas to fill in color.
  // The following steps requires a new set of childrenFilter() and containsContainer()
  //
  childrenFilter = function($root, $child){
    return ($child.width() * $child.height() > 0.2 * $root.width() * $root.height());
  };
  containsContainer = function($root, $child){
    return ($child.width() * $child.height() >= 0.9 * $root.width() * $root.height());
  }

  for(var i = 2; i <= 3; i+=1){
    $container = findContainer($container);
    console.log('level', i, 'container: ', $container);
    if($.isEmptyObject($container)){ // no container will be found any further
      break;
    }
    containers.push({
      left: $container.offset().left - containers[0].left,
      top: $container.offset().top,
      width: $container.innerWidth(),
      height: $container.innerHeight()
    });
  }

  console.log('container[]:', containers);

  // Send sendRequest on window.onload,
  // right after all images are received.
  //
  console.log('doucumnet.readyState:', document.readyState);
  var sendRequest = function(){
    console.log('window loaded.');
    // update top information using document.body.scrollTop
    $.each(containers, function(idx){
      containers[idx].top -= document.body.scrollTop;
    });

    // send request to background
    chrome.extension.sendRequest({
      "time": initTime,
      title: document.title,
      container:containers
    }, function(resp){console.log(resp)});
  };
  if(document.readyState !== 'complete'){
    $(window).load(sendRequest);
  }else{
    // if document is already complete, invoke sendRequest directly.
    sendRequest();
  }
}(window, document));
