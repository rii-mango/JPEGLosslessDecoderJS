JPEGLosslessDecoderJS
=====
A common DICOM compression format is JPEG Lossless.  This format is generally not supported in standard JPEG decoder libraries. 

This decoder can read data from the following DICOM transfer syntaxes:

- 1.2.840.10008.1.2.4.57    JPEG Lossless, Nonhierarchical (Processes 14)
- 1.2.840.10008.1.2.4.70    JPEG Lossless, Nonhierarchical (Processes 14 [Selection 1])

### Usage
[API](https://github.com/rii-mango/JPEGLosslessDecoderJS/wiki/API) and [more examples](https://github.com/rii-mango/JPEGLosslessDecoderJS/tree/master/tests)

```javascript
var decoder = new jpeg.lossless.Decoder();
var output = decoder.decompress(buffer [, offset [, length]]);

// Parameters
// {ArrayBuffer} buffer
// {Number} offset offset into buffer (default = 0)
// {Number} length length of buffer (default = end of JPEG block)

// Returns
// {ArrayBuffer} output (size = cols * rows * bytesPerComponent * numComponents)
```

### Install
Get a packaged source file from the [release folder](https://github.com/rii-mango/JPEGLosslessDecoderJS/tree/master/release):

* [lossless.js](https://raw.githubusercontent.com/rii-mango/JPEGLosslessDecoderJS/master/release/lossless.js)
* [lossless-min.js](https://raw.githubusercontent.com/rii-mango/JPEGLosslessDecoderJS/master/release/lossless-min.js)

Or install via [NPM](https://www.npmjs.com/):

```
npm install jpeg-lossless-decoder-js
```

### Testing
```
npm test
```

### Building
```
npm run build
```
This will output `lossless.js` and `lossless-min.js` alongside declaration files and source maps to `/release`.

### Acknowledgments
This decoder was originally written by Helmut Dersch for Java.  I added support for selection values 2 through 7, contributed bug fixes and ported to JavaScript.

Also thanks to [@jens-ox](https://github.com/jens-ox) for modernizing this package to TypeScript.
