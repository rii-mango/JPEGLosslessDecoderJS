
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

var jpegDataOffset = 1504;
var jpegDataSize = 4682072;
var buf = fs.readFileSync('./tests/data/jpeg_lossless_sel1-rgb.dcm');
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder();
var output = decoder.decompress(data, jpegDataOffset, jpegDataSize);

var assert = require("assert");
describe('driver-sel1-rgb', function () {
    it('dimX should equal 3072', function () {
        assert.equal(3072, decoder.frame.dimX);
    });

    it('dimY should equal 2048', function () {
        assert.equal(2048, decoder.frame.dimY);
    });

    it('number of components should be 3', function () {
        assert.equal(3, decoder.frame.numComp);
    });

    it('decompressed size should be 18874368', function () {
        assert.equal(18874368, output.byteLength);
    });

    it('data checksum should equal 1560195967', function () {
        var checksum = jpeg.lossless.Utils.crc32(new DataView(output));
        assert.equal(checksum, 1560195967);
    });
});
