/*
 * Copyright (C) 2015 Michael Martinez
 * Changes: Added support for selection values 2-7, fixed minor bugs &
 * warnings, split into multiple class files, and general clean up.
 *
 * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
 */

/*
 * Copyright (C) Helmut Dersch
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jslint browser: true, node: true */
/*global require, module */

"use strict";

/*** Imports ***/
var jpeg = jpeg || {};
jpeg.lossless = jpeg.lossless || {};
jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
jpeg.lossless.HuffmanTable = jpeg.lossless.HuffmanTable || ((typeof require !== 'undefined') ? require('./huffman-table.js') : null);
jpeg.lossless.QuantizationTable = jpeg.lossless.QuantizationTable || ((typeof require !== 'undefined') ? require('./quantization-table.js') : null);
jpeg.lossless.ScanHeader = jpeg.lossless.ScanHeader || ((typeof require !== 'undefined') ? require('./scan-header.js') : null);
jpeg.lossless.FrameHeader = jpeg.lossless.FrameHeader || ((typeof require !== 'undefined') ? require('./frame-header.js') : null);
jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


/*** Constructor ***/
jpeg.lossless.Decoder = jpeg.lossless.Decoder || function (buffer, numBytes) {
    this.buffer = buffer;
    this.frame = new jpeg.lossless.FrameHeader();
    this.huffTable = new jpeg.lossless.HuffmanTable();
    this.quantTable = new jpeg.lossless.QuantizationTable();
    this.scan = new jpeg.lossless.ScanHeader();
    this.DU = jpeg.lossless.Utils.createArray(10, 4, 64); // at most 10 data units in a MCU, at most 4 data units in one component
    this.HuffTab = jpeg.lossless.Utils.createArray(4, 2, 50 * 256);
    this.IDCT_Source = [];
    this.nBlock = []; // number of blocks in the i-th Comp in a scan
    this.acTab = jpeg.lossless.Utils.createArray(10, 1); // ac HuffTab for the i-th Comp in a scan
    this.dcTab = jpeg.lossless.Utils.createArray(10, 1); // dc HuffTab for the i-th Comp in a scan
    this.qTab = jpeg.lossless.Utils.createArray(10, 1); // quantization table for the i-th Comp in a scan
    this.marker = 0;
    this.markerIndex = 0;
    this.numComp = 0;
    this.restartInterval = 0;
    this.selection = 0;
    this.xDim = 0;
    this.yDim = 0;
    this.xLoc = 0;
    this.yLoc = 0;
    this.outputData = null;

    if (typeof numBytes === "undefined") {
        this.numBytes = 2;
    } else {
        this.numBytes = numBytes;
    }
};


/*** Static Pseudo-constants ***/

jpeg.lossless.Decoder.IDCT_P = [0, 5, 40, 16, 45, 2, 7, 42, 21, 56, 8, 61, 18, 47, 1, 4, 41, 23, 58, 13, 32, 24, 37, 10, 63, 17, 44, 3, 6, 43, 20,
    57, 15, 34, 29, 48, 53, 26, 39, 9, 60, 19, 46, 22, 59, 12, 33, 31, 50, 55, 25, 36, 11, 62, 14, 35, 28, 49, 52, 27, 38, 30, 51, 54];
jpeg.lossless.Decoder.TABLE = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53,
    10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63];
jpeg.lossless.Decoder.MAX_HUFFMAN_SUBTREE = 50;
jpeg.lossless.Decoder.MSB = 0x80000000;


/*** Prototype Methods ***/

jpeg.lossless.Decoder.prototype.decode = function (buffer, offset, length, numBytes) {
    /*jslint bitwise: true */

    var current, scanNum = 0, pred = [], i, compN, temp = [], index = [], mcuNum;

    if (typeof buffer !== "undefined") {
        this.buffer = buffer;
    }

    if (typeof numBytes !== "undefined") {
        this.numBytes = numBytes;
    }

    if (this.numBytes === 2) {
        this.getter = this.getValue16;
        this.setter = this.setValue16;
    } else if (this.numBytes === 1) {
        this.getter = this.getValue8;
        this.setter = this.setValue8;
    }

    this.stream = new jpeg.lossless.DataStream(this.buffer, offset, length);
    this.buffer = null;

    this.xLoc = 0;
    this.yLoc = 0;
    current = this.stream.get16();

    if (current !== 0xFFD8) { // SOI
        throw new Error("Not a JPEG file");
    }

    current = this.stream.get16();

    while ((((current >> 4) !== 0x0FFC) || (current === 0xFFC4))) { // SOF 0~15
        switch (current) {
            case 0xFFC4: // DHT
                this.huffTable.read(this.stream, this.HuffTab);
                break;
            case 0xFFCC: // DAC
                throw new Error("Program doesn't support arithmetic coding. (format throw new IOException)");
            case 0xFFDB:
                this.quantTable.read(this.stream, jpeg.lossless.Decoder.TABLE);
                break;
            case 0xFFDD:
                this.restartInterval = this.readNumber();
                break;
            case 0xFFE0:
            case 0xFFE1:
            case 0xFFE2:
            case 0xFFE3:
            case 0xFFE4:
            case 0xFFE5:
            case 0xFFE6:
            case 0xFFE7:
            case 0xFFE8:
            case 0xFFE9:
            case 0xFFEA:
            case 0xFFEB:
            case 0xFFEC:
            case 0xFFED:
            case 0xFFEE:
            case 0xFFEF:
                this.readApp();
                break;
            case 0xFFFE:
                this.readComment();
                break;
            default:
                if ((current >> 8) !== 0xFF) {
                    throw new Error("ERROR: format throw new IOException! (decode)");
                }
        }

        current = this.stream.get16();
    }

    if ((current < 0xFFC0) || (current > 0xFFC7)) {
        throw new Error("ERROR: could not handle arithmetic code!");
    }

    this.frame.read(this.stream);
    current = this.stream.get16();

    do {
        while (current !== 0x0FFDA) { // SOS
            switch (current) {
                case 0xFFC4: // DHT
                    this.huffTable.read(this.stream, this.HuffTab);
                    break;
                case 0xFFCC: // DAC
                    throw new Error("Program doesn't support arithmetic coding. (format throw new IOException)");
                case 0xFFDB:
                    this.quantTable.read(this.stream, jpeg.lossless.Decoder.TABLE);
                    break;
                case 0xFFDD:
                    this.restartInterval = this.readNumber();
                    break;
                case 0xFFE0:
                case 0xFFE1:
                case 0xFFE2:
                case 0xFFE3:
                case 0xFFE4:
                case 0xFFE5:
                case 0xFFE6:
                case 0xFFE7:
                case 0xFFE8:
                case 0xFFE9:
                case 0xFFEA:
                case 0xFFEB:
                case 0xFFEC:
                case 0xFFED:
                case 0xFFEE:
                case 0xFFEF:
                    this.readApp();
                    break;
                case 0xFFFE:
                    this.readComment();
                    break;
                default:
                    if ((current >> 8) !== 0xFF) {
                        throw new Error("ERROR: format throw new IOException! (Parser.decode)");
                    }
            }

            current = this.stream.get16();
        }

        this.precision = this.frame.precision;
        this.components = this.frame.components;

        this.scan.read(this.stream);
        this.numComp = this.scan.numComp;
        this.selection = this.scan.selection;

        this.scanComps = this.scan.components;
        this.quantTables = this.quantTable.quantTables;

        for (i = 0; i < this.numComp; i+=1) {
            compN = this.scanComps[i].scanCompSel;
            this.qTab[i] = this.quantTables[this.components[compN].quantTableSel];
            this.nBlock[i] = this.components[compN].vSamp * this.components[compN].hSamp;
            this.dcTab[i] = this.HuffTab[this.scanComps[i].dcTabSel][0];
            this.acTab[i] = this.HuffTab[this.scanComps[i].acTabSel][1];
        }

        this.xDim = this.frame.dimX;
        this.yDim = this.frame.dimY;
        this.outputData = new DataView(new ArrayBuffer(this.xDim * this.yDim * this.numBytes));

        scanNum+=1;

        while (true) { // Decode one scan
            temp[0] = 0;
            index[0] = 0;

            for (i = 0; i < 10; i+=1) {
                pred[i] = (1 << (this.precision - 1));
            }

            if (this.restartInterval === 0) {
                current = this.decodeUnit(pred, temp, index);

                while ((current === 0) && ((this.xLoc < this.xDim) && (this.yLoc < this.yDim))) {
                    this.output(pred);
                    current = this.decodeUnit(pred, temp, index);
                }

                break; //current=MARKER
            }

            for (mcuNum = 0; mcuNum < this.restartInterval; mcuNum+=1) {
                current = this.decodeUnit(pred, temp, index);
                this.output(pred);

                if (current !== 0) {
                    break;
                }
            }

            if (current === 0) {
                if (this.markerIndex !== 0) {
                    current = (0xFF00 | this.marker);
                    this.markerIndex = 0;
                } else {
                    current = this.stream.get16();
                }
            }

            if (!((current >= 0xFFD0) && (current <= 0xFFD7))) {
                break; //current=MARKER
            }
        }

        if ((current === 0xFFDC) && (scanNum === 1)) { //DNL
            this.readNumber();
            current = this.stream.get16();
        }
    } while ((current !== 0xFFD9) && ((this.xLoc < this.xDim) && (this.yLoc < this.yDim)) && (scanNum === 0));

    return this.outputData;
};



jpeg.lossless.Decoder.prototype.decodeUnit = function (prev, temp, index) {
    /*jslint bitwise: true */

    var value, actab, dctab, qtab, ctrC, i, k, j;

    switch (this.selection) {
        case 2:
            prev[0] = this.getPreviousY();
            break;
        case 3:
            prev[0] = this.getPreviousXY();
            break;
        case 4:
            prev[0] = (this.getPreviousX() + this.getPreviousY()) - this.getPreviousXY();
            break;
        case 5:
            prev[0] = this.getPreviousX() + ((this.getPreviousY() - this.getPreviousXY()) >> 1);
            break;
        case 6:
            prev[0] = this.getPreviousY() + ((this.getPreviousX() - this.getPreviousXY()) >> 1);
            break;
        case 7:
            prev[0] = ((this.getPreviousX() + this.getPreviousY()) / 2);
            break;
        default:
            prev[0] = this.getPreviousX();
            break;
    }

    if (this.numComp > 1) {
        for (ctrC = 0; ctrC < this.numComp; ctrC+=1) {
            qtab = this.qTab[ctrC];
            actab = this.acTab[ctrC];
            dctab = this.dcTab[ctrC];
            for (i = 0; i < this.nBlock[ctrC]; i+=1) {
                for (k = 0; k < this.IDCT_Source.length; k+=1) {
                    this.IDCT_Source[k] = 0;
                }

                value = this.getHuffmanValue(dctab, temp, index);

                if (value >= 0xFF00) {
                    return value;
                }

                prev[ctrC] = this.IDCT_Source[0] = prev[ctrC] + this.getn(index, value, temp, index);
                this.IDCT_Source[0] *= qtab[0];

                for (j = 1; j < 64; j+=1) {
                    value = this.getHuffmanValue(actab, temp, index);

                    if (value >= 0xFF00) {
                        return value;
                    }

                    j += (value >> 4);

                    if ((value & 0x0F) === 0) {
                        if ((value >> 4) === 0) {
                            break;
                        }
                    } else {
                        this.IDCT_Source[jpeg.lossless.Decoder.IDCT_P[j]] = this.getn(index, value & 0x0F, temp, index) * qtab[j];
                    }
                }

                this.scaleIDCT(this.DU[ctrC][i]);
            }
        }

        return 0;
    } else {
        for (i = 0; i < this.nBlock[0]; i+=1) {
            value = this.getHuffmanValue(this.dcTab[0], temp, index);
            if (value >= 0xFF00) {
                return value;
            }

            prev[0] += this.getn(prev, value, temp, index);
        }

        return 0;
    }
};



//	Huffman table for fast search: (HuffTab) 8-bit Look up table 2-layer search architecture, 1st-layer represent 256 node (8 bits) if codeword-length > 8
//	bits, then the entry of 1st-layer = (# of 2nd-layer table) | MSB and it is stored in the 2nd-layer Size of tables in each layer are 256.
//	HuffTab[*][*][0-256] is always the only 1st-layer table.
//
//	An entry can be: (1) (# of 2nd-layer table) | MSB , for code length > 8 in 1st-layer (2) (Code length) << 8 | HuffVal
//
//	HuffmanValue(table   HuffTab[x][y] (ex) HuffmanValue(HuffTab[1][0],...)
//	                ):
//	    return: Huffman Value of table
//	            0xFF?? if it receives a MARKER
//	    Parameter:  table   HuffTab[x][y] (ex) HuffmanValue(HuffTab[1][0],...)
//	                temp    temp storage for remainded bits
//	                index   index to bit of temp
//	                in      FILE pointer
//	    Effect:
//	        temp  store new remainded bits
//	        index change to new index
//	        in    change to new position
//	    NOTE:
//	      Initial by   temp=0; index=0;
//	    NOTE: (explain temp and index)
//	      temp: is always in the form at calling time or returning time
//	       |  byte 4  |  byte 3  |  byte 2  |  byte 1  |
//	       |     0    |     0    | 00000000 | 00000??? |  if not a MARKER
//	                                               ^index=3 (from 0 to 15)
//	                                               321
//	    NOTE (marker and marker_index):
//	      If get a MARKER from 'in', marker=the low-byte of the MARKER
//	        and marker_index=9
//	      If marker_index=9 then index is always > 8, or HuffmanValue()
//	        will not be called
jpeg.lossless.Decoder.prototype.getHuffmanValue = function (table, temp, index) {
    /*jslint bitwise: true */

    var code, input, mask;
    mask = 0xFFFF;

    if (index[0] < 8) {
        temp[0] <<= 8;
        input = this.stream.get8();
        if (input === 0xFF) {
            this.marker = this.stream.get8();
            if (this.marker !== 0) {
                this.markerIndex = 9;
            }
        }
        temp[0] |= input;
    } else {
        index[0] -= 8;
    }

    code = table[temp[0] >> index[0]];

    if ((code & jpeg.lossless.Decoder.MSB) !== 0) {
        if (this.markerIndex !== 0) {
            this.markerIndex = 0;
            return 0xFF00 | this.marker;
        }

        temp[0] &= (mask >> (16 - index[0]));
        temp[0] <<= 8;
        input = this.stream.get8();

        if (input === 0xFF) {
            this.marker = this.stream.get8();
            if (this.marker !== 0) {
                this.markerIndex = 9;
            }
        }

        temp[0] |= input;
        code = table[((code & 0xFF) * 256) + (temp[0] >> index[0])];
        index[0] += 8;
    }

    index[0] += 8 - (code >> 8);

    if (index[0] < 0) {
        throw new Error("index=" + index[0] + " temp=" + temp[0] + " code=" + code + " in HuffmanValue()");
    }

    if (index[0] < this.markerIndex) {
        this.markerIndex = 0;
        return 0xFF00 | this.marker;
    }

    temp[0] &= (mask >> (16 - index[0]));
    return code & 0xFF;
};



jpeg.lossless.Decoder.prototype.getn = function (PRED, n, temp, index) {
    /*jslint bitwise: true */

    var result, one, n_one, mask, input;
    one = 1;
    n_one = -1;
    mask = 0xFFFF;

    if (n === 0) {
        return 0;
    }

    if (n === 16) {
        if (PRED[0] >= 0) {
            return -32768;
        } else {
            return 32768;
        }
    }

    index[0] -= n;

    if (index[0] >= 0) {
        if ((index[0] < this.markerIndex) && !this.isLastPixel()) { // this was corrupting the last pixel in some cases
            this.markerIndex = 0;
            return (0xFF00 | this.marker) << 8;
        }

        result = temp[0] >> index[0];
        temp[0] &= (mask >> (16 - index[0]));
    } else {
        temp[0] <<= 8;
        input = this.stream.get8();

        if (input === 0xFF) {
            this.marker = this.stream.get8();
            if (this.marker !== 0) {
                this.markerIndex = 9;
            }
        }

        temp[0] |= input;
        index[0] += 8;

        if (index[0] < 0) {
            if (this.markerIndex !== 0) {
                this.markerIndex = 0;
                return (0xFF00 | this.marker) << 8;
            }

            temp[0] <<= 8;
            input = this.stream.get8();

            if (input === 0xFF) {
                this.marker = this.stream.get8();
                if (this.marker !== 0) {
                    this.markerIndex = 9;
                }
            }

            temp[0] |= input;
            index[0] += 8;
        }

        if (index[0] < 0) {
            throw new Error("index=" + index[0] + " in getn()");
        }

        if (index[0] < this.markerIndex) {
            this.markerIndex = 0;
            return (0xFF00 | this.marker) << 8;
        }

        result = temp[0] >> index[0];
        temp[0] &= (mask >> (16 - index[0]));
    }

    if (result < (one << (n - 1))) {
        result += (n_one << n) + 1;
    }

    return result;
};



jpeg.lossless.Decoder.prototype.getPreviousX = function () {
    /*jslint bitwise: true */

    if (this.xLoc > 0) {
        return this.getter((((this.yLoc * this.xDim) + this.xLoc) - 1));
    } else if (this.yLoc > 0) {
        return this.getPreviousY();
    } else {
        return (1 << (this.frame.precision - 1));
    }
};



jpeg.lossless.Decoder.prototype.getPreviousXY = function () {
    /*jslint bitwise: true */

    if ((this.xLoc > 0) && (this.yLoc > 0)) {
        return this.getter(((((this.yLoc - 1) * this.xDim) + this.xLoc) - 1));
    } else {
        return this.getPreviousY();
    }
};



jpeg.lossless.Decoder.prototype.getPreviousY = function () {
    /*jslint bitwise: true */

    if (this.yLoc > 0) {
        return this.getter((((this.yLoc - 1) * this.xDim) + this.xLoc));
    } else {
        return this.getPreviousX();
    }
};



jpeg.lossless.Decoder.prototype.isLastPixel = function () {
    return (this.xLoc === (this.xDim - 1)) && (this.yLoc === (this.yDim - 1));
};



jpeg.lossless.Decoder.prototype.output = function (PRED) {
    if ((this.xLoc < this.xDim) && (this.yLoc < this.yDim)) {
        this.setter((((this.yLoc * this.xDim) + this.xLoc)), PRED[0]);

        this.xLoc+=1;

        if (this.xLoc >= this.xDim) {
            this.yLoc+=1;
            this.xLoc = 0;
        }
    }
};



jpeg.lossless.Decoder.prototype.setValue16 = function (index, val) {
    this.outputData.setInt16(index * 2, val, true);
};



jpeg.lossless.Decoder.prototype.getValue16 = function (index) {
    return this.outputData.getInt16(index * 2, true);
};



jpeg.lossless.Decoder.prototype.setValue8 = function (index, val) {
    this.outputData.setInt8(index, val);
};



jpeg.lossless.Decoder.prototype.getValue8 = function (index) {
    return this.outputData.getInt8(index);
};



jpeg.lossless.Decoder.prototype.readApp = function() {
    var count = 0, length = this.stream.get16();
    count += 2;

    while (count < length) {
        this.stream.get8();
        count+=1;
    }

    return length;
};



jpeg.lossless.Decoder.prototype.readComment = function () {
    var sb = "", count = 0, length;

    length = this.stream.get16();
    count += 2;

    while (count < length) {
        sb += this.stream.get8();
        count+=1;
    }

    return sb;
};



jpeg.lossless.Decoder.prototype.readNumber = function() {
    var Ld = this.stream.get16();

    if (Ld !== 4) {
        throw new Error("ERROR: Define number format throw new IOException [Ld!=4]");
    }

    return this.stream.get16();
};



jpeg.lossless.Decoder.prototype.scaleIDCT = function (matrix) {
    /*jslint bitwise: true */

    var p = jpeg.lossless.Utils.createArray(8, 8), t0, t1, t2, t3, i, src0, src1, src2, src3, src4, src5, src6, src7, det0, det1, det2, det3, det4,
        det5, det6, det7, mindex = 0;

    for (i = 0; i < 8; i+=1) {
        src0 = this.IDCT_Source[(0) + i];
        src1 = this.IDCT_Source[(8) + i];
        src2 = this.IDCT_Source[(16) + i] - this.IDCT_Source[(24) + i];
        src3 = this.IDCT_Source[(24) + i] + this.IDCT_Source[(16) + i];
        src4 = this.IDCT_Source[(32) + i] - this.IDCT_Source[(56) + i];
        src6 = this.IDCT_Source[(40) + i] - this.IDCT_Source[(48) + i];
        t0 = this.IDCT_Source[(40) + i] + this.IDCT_Source[(48) + i];
        t1 = this.IDCT_Source[(32) + i] + this.IDCT_Source[(56) + i];
        src5 = t0 - t1;
        src7 = t0 + t1;

        det4 = (-src4 * 480) - (src6 * 192);
        det5 = src5 * 384;
        det6 = (src6 * 480) - (src4 * 192);
        det7 = src7 * 256;
        t0 = src0 * 256;
        t1 = src1 * 256;
        t2 = src2 * 384;
        t3 = src3 * 256;
        det3 = t3;
        det0 = t0 + t1;
        det1 = t0 - t1;
        det2 = t2 - t3;

        src0 = det0 + det3;
        src1 = det1 + det2;
        src2 = det1 - det2;
        src3 = det0 - det3;
        src4 = det6 - det4 - det5 - det7;
        src5 = (det5 - det6) + det7;
        src6 = det6 - det7;
        src7 = det7;

        p[0][i] = (src0 + src7 + (1 << 12)) >> 13;
        p[1][i] = (src1 + src6 + (1 << 12)) >> 13;
        p[2][i] = (src2 + src5 + (1 << 12)) >> 13;
        p[3][i] = (src3 + src4 + (1 << 12)) >> 13;
        p[4][i] = ((src3 - src4) + (1 << 12)) >> 13;
        p[5][i] = ((src2 - src5) + (1 << 12)) >> 13;
        p[6][i] = ((src1 - src6) + (1 << 12)) >> 13;
        p[7][i] = ((src0 - src7) + (1 << 12)) >> 13;
    }

    for (i = 0; i < 8; i+=1) {
        src0 = p[i][0];
        src1 = p[i][1];
        src2 = p[i][2] - p[i][3];
        src3 = p[i][3] + p[i][2];
        src4 = p[i][4] - p[i][7];
        src6 = p[i][5] - p[i][6];
        t0 = p[i][5] + p[i][6];
        t1 = p[i][4] + p[i][7];
        src5 = t0 - t1;
        src7 = t0 + t1;

        det4 = (-src4 * 480) - (src6 * 192);
        det5 = src5 * 384;
        det6 = (src6 * 480) - (src4 * 192);
        det7 = src7 * 256;
        t0 = src0 * 256;
        t1 = src1 * 256;
        t2 = src2 * 384;
        t3 = src3 * 256;
        det3 = t3;
        det0 = t0 + t1;
        det1 = t0 - t1;
        det2 = t2 - t3;

        src0 = det0 + det3;
        src1 = det1 + det2;
        src2 = det1 - det2;
        src3 = det0 - det3;
        src4 = det6 - det4 - det5 - det7;
        src5 = (det5 - det6) + det7;
        src6 = det6 - det7;
        src7 = det7;

        matrix[mindex+=1] = (src0 + src7 + (1 << 12)) >> 13;
        matrix[mindex+=1] = (src1 + src6 + (1 << 12)) >> 13;
        matrix[mindex+=1] = (src2 + src5 + (1 << 12)) >> 13;
        matrix[mindex+=1] = (src3 + src4 + (1 << 12)) >> 13;
        matrix[mindex+=1] = ((src3 - src4) + (1 << 12)) >> 13;
        matrix[mindex+=1] = ((src2 - src5) + (1 << 12)) >> 13;
        matrix[mindex+=1] = ((src1 - src6) + (1 << 12)) >> 13;
        matrix[mindex+=1] = ((src0 - src7) + (1 << 12)) >> 13;
    }
};



/*** Exports ***/

var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.Decoder;
}
