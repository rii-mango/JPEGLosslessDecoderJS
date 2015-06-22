JPEGLosslessDecoderJS
=====
A common DICOM compression format is JPEG Lossless.  This format is generally not supported in standard JPEG decoder libraries. 

This decoder can read data from the following DICOM transfer syntaxes:

- 1.2.840.10008.1.2.4.57    JPEG Lossless, Nonhierarchical (Processes 14)
- 1.2.840.10008.1.2.4.70    JPEG Lossless, Nonhierarchical (Processes 14 [Selection 1])

###Usage
See tests/driver.js to run this example:

```javascript
var decoder = new jpeg.lossless.Decoder(compressedBytes);  // optional second parameter to specify 1 or 2 byte output
var decompressedData = decoder.decode();
```

###Building
```shell
./build.sh # normal build
./build-min.sh # minimized build
```

###Acknowledgments
This library was originally written by Helmut Dersch for Java, later released by JNode.  I added support for selection values 2 to 7 and ported to JavaScript.
