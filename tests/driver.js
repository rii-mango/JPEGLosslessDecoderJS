
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

var jpegDataOffset = 1654;
var jpegDataSize = 143474;

var buf = new Buffer(jpegDataSize);

var fd = fs.openSync('./data/jpeg_lossless_sel1.dcm', "r");
fs.readSync(fd, buf, 0, buf.length, jpegDataOffset);
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder(data);
var output = decoder.decode();
console.log("compressed size = " + data.byteLength);
console.log("frame: dimX="+decoder.frame.dimX + " dimY=" + decoder.frame.dimY + " components=" + decoder.frame.numComp);
console.log("decompressed size = " + output.byteLength);
