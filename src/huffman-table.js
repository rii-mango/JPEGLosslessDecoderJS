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
jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


/*** Constructor ***/
jpeg.lossless.HuffmanTable = jpeg.lossless.HuffmanTable || function () {
    this.l = jpeg.lossless.Utils.createArray(4, 2, 16);
    this.th = [];
    this.v = jpeg.lossless.Utils.createArray(4, 2, 16, 200);
    this.tc = jpeg.lossless.Utils.createArray(4, 2);

    this.tc[0][0] = 0;
    this.tc[1][0] = 0;
    this.tc[2][0] = 0;
    this.tc[3][0] = 0;
    this.tc[0][1] = 0;
    this.tc[1][1] = 0;
    this.tc[2][1] = 0;
    this.tc[3][1] = 0;
    this.th[0] = 0;
    this.th[1] = 0;
    this.th[2] = 0;
    this.th[3] = 0;
};



/*** Static Pseudo-constants ***/

jpeg.lossless.HuffmanTable.MSB = 0x80000000;


/*** Prototype Methods ***/

jpeg.lossless.HuffmanTable.prototype.read = function(data, HuffTab) {
    /*jslint bitwise: true */

    var count = 0, length, temp, t, c, i, j;

    length = data.get16();
    count += 2;

    while (count < length) {
        temp = data.get8();
        count+=1;
        t = temp & 0x0F;
        if (t > 3) {
            throw new Error("ERROR: Huffman table ID > 3");
        }

        c = temp >> 4;
        if (c > 2) {
            throw new Error("ERROR: Huffman table [Table class > 2 ]");
        }

        this.th[t] = 1;
        this.tc[t][c] = 1;

        for (i = 0; i < 16; i+=1) {
            this.l[t][c][i] = data.get8();
            count+=1;
        }

        for (i = 0; i < 16; i+=1) {
            for (j = 0; j < this.l[t][c][i]; j+=1) {
                if (count > length) {
                    throw new Error("ERROR: Huffman table format error [count>Lh]");
                }

                this.v[t][c][i][j] = data.get8();
                count+=1;
            }
        }
    }

    if (count !== length) {
        throw new Error("ERROR: Huffman table format error [count!=Lf]");
    }

    for (i = 0; i < 4; i+=1) {
        for (j = 0; j < 2; j+=1) {
            if (this.tc[i][j] !== 0) {
                this.buildHuffTable(HuffTab[i][j], this.l[i][j], this.v[i][j]);
            }
        }
    }

    return 1;
};



//	Build_HuffTab()
//	Parameter:  t       table ID
//	            c       table class ( 0 for DC, 1 for AC )
//	            L[i]    # of codewords which length is i
//	            V[i][j] Huffman Value (length=i)
//	Effect:
//	    build up HuffTab[t][c] using L and V.
jpeg.lossless.HuffmanTable.prototype.buildHuffTable = function(tab, L, V) {
    /*jslint bitwise: true */

    var currentTable, temp, k, i, j, n;
    temp = 256;
    k = 0;

    for (i = 0; i < 8; i+=1) { // i+1 is Code length
        for (j = 0; j < L[i]; j+=1) {
            for (n = 0; n < (temp >> (i + 1)); n+=1) {
                tab[k] = V[i][j] | ((i + 1) << 8);
                k+=1;
            }
        }
    }

    for (i = 1; k < 256; i+=1, k+=1) {
        tab[k] = i | jpeg.lossless.HuffmanTable.MSB;
    }

    currentTable = 1;
    k = 0;

    for (i = 8; i < 16; i+=1) { // i+1 is Code length
        for (j = 0; j < L[i]; j+=1) {
            for (n = 0; n < (temp >> (i - 7)); n+=1) {
                tab[(currentTable * 256) + k] = V[i][j] | ((i + 1) << 8);
                k+=1;
            }

            if (k >= 256) {
                if (k > 256) {
                    throw new Error("ERROR: Huffman table error(1)!");
                }

                k = 0;
                currentTable+=1;
            }
        }
    }
};


/*** Exports ***/

var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.HuffmanTable;
}
