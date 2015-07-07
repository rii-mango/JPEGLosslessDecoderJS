
/*jslint browser: true, node: true */
/*global require, module */

"use strict";

var jpeg = require('../src/main.js');


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

var fd = fs.openSync('./tests/data/jpeg_lossless_sel1.dcm', "r");
fs.readSync(fd, buf, 0, buf.length, jpegDataOffset);
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder(data);
var output = decoder.decode();

var assert = require("assert");
describe('JPEGLosslessDecoderJS', function () {
    it('dimX should equal 512', function () {
        assert.equal(512, decoder.frame.dimX);
    });

    it('dimY should equal 400', function () {
        assert.equal(400, decoder.frame.dimY);
    });

    it('number of components should be 1', function () {
        assert.equal(1, decoder.frame.numComp);
    });

    it('decompressed size should be 409600', function () {
        assert.equal(409600, output.byteLength);
    });
});
