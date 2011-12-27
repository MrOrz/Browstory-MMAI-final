/* process.js */

(function(window, document, $, undefined){
  "use strict";
  // private variables is declaired here.
  //
  var canvas, img = new Image(),
    dfd = $.Deferred(), // deferred object to return on processImage()

    // Process the image, given the data URI.
    // http://en.wikipedia.org/wiki/Data:_URL
    //
    process = function(){
      // Process the image, generate necessary features.
      //
      // Canvas tutorial:
      // https://developer.mozilla.org/en/Canvas_tutorial
      // Canvas cheatsheet:
      // http://blog.nihilogic.dk/2009/02/html5-canvas-cheat-sheet.html
      // Pixel Manipulation with Canvas
      // https://developer.mozilla.org/En/HTML/Canvas/Pixel_manipulation_with_canvas

      // Retrieve image width and height from data URI
      // by assigning the URI to a html image element.
      //
      var width = img.width,
          height = img.height,
          ctx = canvas.getContext('2d'), // access the drawing context.
          imageData;

      // Set canvas width and height, since canvas's dimensions
      // will scale the image.
      //
      canvas.width = width; canvas.height = height;

      // Draw img on canvas.
      //
      ctx.drawImage(img, 0, 0);
      imageData = ctx.getImageData(0, 0, width, height);

      console.log('Image ', width, 'x', height, ', with imageData = ', imageData);

      // TODO: image processing goes here ...


      // No need to return value.

      dfd.resolve();
    }; // end of var statement

  // bind img onload handler to the function 'process'
  //
  img.onload = process;

  // exposed method processImage(dataURI)
  window.processImage = function(dataURI){
    dfd = $.Deferred();

    // when the img is fully loaded, the function process will be invoked.
    img.src = dataURI;

    return dfd.promise();
  };

  // Initialization when DOM is ready.
  //
  $(document).ready(function(){
    // populate canvas object
    canvas = document.getElementById('canvas');
  })
}(window, document, jQuery));