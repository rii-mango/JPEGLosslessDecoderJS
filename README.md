# JPEGLosslessDecoderJS
A JPEG Lossless decoder (JavaScript).

```javascript
var buf = fs.readFileSync('./data/data.lossless');
var data = toArrayBuffer(buf);
var decoder = new jpeg.lossless.Decoder(data, 2);
var output = decoder.decode();
console.log("compressed size = " + data.byteLength);
console.log("frame: dimX="+decoder.frame.dimX + " dimY=" + decoder.frame.dimY + " components=" + decoder.frame.numComp);
console.log("decompressed size = " + output.byteLength);
```
