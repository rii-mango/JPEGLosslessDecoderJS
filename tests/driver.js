
/*jslint browser: true, node: true */
/*global require, module */

"use strict";

var jpeg = {};
jpeg.lossless = {};
jpeg.lossless.Decoder = require('../src/decoder.js');

var fs = require('fs');


function toArrayBuffer(buffer) {
    var ab, view, i;

    ab = new ArrayBuffer(buffer.length);
    view = new Uint8Array(ab);
    for (i = 0; i < buffer.length; i += 1) {
        view[i] = buffer[i];
    }
    return ab;
}

var buf = fs.readFileSync('./data/data.lossless');
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder(data);
var output = decoder.decode();
console.log("compressed size = " + data.byteLength);
console.log("frame: dimX="+decoder.frame.dimX + " dimY=" + decoder.frame.dimY + " components=" + decoder.frame.numComp);
console.log("decompressed size = " + output.byteLength);
