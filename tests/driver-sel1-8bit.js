
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

var jpegDataOffset = 1070;
var jpegDataSize = 74137;
var buf = fs.readFileSync('./tests/data/jpeg_lossless_sel1-8bit.dcm');
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder();
var output = decoder.decompress(data, jpegDataOffset, jpegDataSize);

var assert = require("assert");
describe('driver-sel1-8bit', function () {
    it('dimX should equal 512', function () {
        assert.equal(512, decoder.frame.dimX);
    });

    it('dimY should equal 512', function () {
        assert.equal(512, decoder.frame.dimY);
    });

    it('number of components should be 1', function () {
        assert.equal(1, decoder.frame.numComp);
    });

    it('decompressed size should be 262144', function () {
        assert.equal(262144, output.byteLength);
    });

    it('data checksum should equal 2307286885', function () {
        var checksum = jpeg.lossless.Utils.crc32(new DataView(output));
        assert.equal(checksum, 2307286885);
    });
});
