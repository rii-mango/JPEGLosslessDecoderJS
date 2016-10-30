/*
 * Copyright (C) 2015 Michael Martinez
 * Changes: Added support for selection values 2-7, fixed minor bugs &
 * warnings, split into multiple class files, and general clean up.
 *
 * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
 */

/*
 * Copyright (C) Helmut Dersch
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jslint browser: true, node: true */
/*global require, module */

"use strict";

/*** Imports ***/
var jpeg = jpeg || {};
jpeg.lossless = jpeg.lossless || {};


/*** Constructor ***/
jpeg.lossless.Utils = jpeg.lossless.Utils || {};


/*** Static methods ***/

// http://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript
jpeg.lossless.Utils.createArray = function (length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = jpeg.lossless.Utils.createArray.apply(this, args);
    }

    return arr;
};


// http://stackoverflow.com/questions/18638900/javascript-crc32
jpeg.lossless.Utils.makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
};

jpeg.lossless.Utils.crc32 = function(dataView) {
    var uint8view = new Uint8Array(dataView.buffer);
    var crcTable = jpeg.lossless.Utils.crcTable || (jpeg.lossless.Utils.crcTable = jpeg.lossless.Utils.makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < uint8view.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ uint8view[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};


/*** Exports ***/

var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.Utils;
}
