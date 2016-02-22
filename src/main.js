/*jslint browser: true, node: true */
/*global require, module */

"use strict";

/*** Imports ****/

/**
 * jpeg
  * @type {*|{}}
 */
var jpeg = jpeg || {};

/**
 * jpeg.lossless
 * @type {*|{}}
 */
jpeg.lossless = jpeg.lossless || {};


jpeg.lossless.ComponentSpec = jpeg.lossless.ComponentSpec || ((typeof require !== 'undefined') ? require('./component-spec.js') : null);
jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
jpeg.lossless.Decoder = jpeg.lossless.Decoder || ((typeof require !== 'undefined') ? require('./decoder.js') : null);
jpeg.lossless.FrameHeader = jpeg.lossless.FrameHeader || ((typeof require !== 'undefined') ? require('./frame-header.js') : null);
jpeg.lossless.HuffmanTable = jpeg.lossless.HuffmanTable || ((typeof require !== 'undefined') ? require('./huffman-table.js') : null);
jpeg.lossless.QuantizationTable = jpeg.lossless.QuantizationTable || ((typeof require !== 'undefined') ? require('./quantization-table.js') : null);
jpeg.lossless.ScanComponent = jpeg.lossless.ScanComponent || ((typeof require !== 'undefined') ? require('./scan-component.js') : null);
jpeg.lossless.ScanHeader = jpeg.lossless.ScanHeader || ((typeof require !== 'undefined') ? require('./scan-header.js') : null);
jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


/*** Exports ***/
var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg;
}
