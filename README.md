JPEGLosslessDecoderJS
=====
A common DICOM compression format is JPEG Lossless.  This format is generally not supported in standard JPEG decoder libraries. 

This decoder can read the following DICOM transfer syntaxes:

- 1.2.840.10008.1.2.4.57    JPEG Lossless, Nonhierarchical (Processes 14)
- 1.2.840.10008.1.2.4.70    JPEG Lossless, Nonhierarchical (Processes 14 [Selection 1])

Usage
-----
```javascript
var buf = fs.readFileSync('./data/data.lossless');
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder(data, 2);
var output = decoder.decode();
console.log("compressed size = " + data.byteLength);
console.log("frame: dimX="+decoder.frame.dimX + " dimY=" + decoder.frame.dimY + " components=" + decoder.frame.numComp);
console.log("decompressed size = " + output.byteLength);
```

Acknowledgments
-----
This library was originally written by Helmut Dersch for Java, later released by JNode.  I added support for selection values 2 to 7 and ported to JavaScript.
