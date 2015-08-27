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
jpeg.lossless.QuantizationTable = jpeg.lossless.QuantizationTable || function () {
    this.precision = []; // Quantization precision 8 or 16
    this.tq = []; // 1: this table is presented
    this.quantTables = jpeg.lossless.Utils.createArray(4, 64); // Tables

    this.tq[0] = 0;
    this.tq[1] = 0;
    this.tq[2] = 0;
    this.tq[3] = 0;
};



/*** Static Methods ***/

jpeg.lossless.QuantizationTable.enhanceQuantizationTable = function(qtab, table) {
    /*jslint bitwise: true */

    var i;

    for (i = 0; i < 8; i+=1) {
        qtab[table[(0 * 8) + i]] *= 90;
        qtab[table[(4 * 8) + i]] *= 90;
        qtab[table[(2 * 8) + i]] *= 118;
        qtab[table[(6 * 8) + i]] *= 49;
        qtab[table[(5 * 8) + i]] *= 71;
        qtab[table[(1 * 8) + i]] *= 126;
        qtab[table[(7 * 8) + i]] *= 25;
        qtab[table[(3 * 8) + i]] *= 106;
    }

    for (i = 0; i < 8; i+=1) {
        qtab[table[0 + (8 * i)]] *= 90;
        qtab[table[4 + (8 * i)]] *= 90;
        qtab[table[2 + (8 * i)]] *= 118;
        qtab[table[6 + (8 * i)]] *= 49;
        qtab[table[5 + (8 * i)]] *= 71;
        qtab[table[1 + (8 * i)]] *= 126;
        qtab[table[7 + (8 * i)]] *= 25;
        qtab[table[3 + (8 * i)]] *= 106;
    }

    for (i = 0; i < 64; i+=1) {
        qtab[i] >>= 6;
    }
};


/*** Prototype Methods ***/

jpeg.lossless.QuantizationTable.prototype.read = function (data, table) {
    /*jslint bitwise: true */

    var count = 0, length, temp, t, i;

    length = data.get16();
    count += 2;

    while (count < length) {
        temp = data.get8();
        count+=1;
        t = temp & 0x0F;

        if (t > 3) {
            throw new Error("ERROR: Quantization table ID > 3");
        }

        this.precision[t] = temp >> 4;

        if (this.precision[t] === 0) {
            this.precision[t] = 8;
        } else if (this.precision[t] === 1) {
            this.precision[t] = 16;
        } else {
            throw new Error("ERROR: Quantization table precision error");
        }

        this.tq[t] = 1;

        if (this.precision[t] === 8) {
            for (i = 0; i < 64; i+=1) {
                if (count > length) {
                    throw new Error("ERROR: Quantization table format error");
                }

                this.quantTables[t][i] = data.get8();
                count+=1;
            }

            jpeg.lossless.QuantizationTable.enhanceQuantizationTable(this.quantTables[t], table);
        } else {
            for (i = 0; i < 64; i+=1) {
                if (count > length) {
                    throw new Error("ERROR: Quantization table format error");
                }

                this.quantTables[t][i] = data.get16();
                count += 2;
            }

            jpeg.lossless.QuantizationTable.enhanceQuantizationTable(this.quantTables[t], table);
        }
    }

    if (count !== length) {
        throw new Error("ERROR: Quantization table error [count!=Lq]");
    }

    return 1;
};



/*** Exports ***/

var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.QuantizationTable;
}
