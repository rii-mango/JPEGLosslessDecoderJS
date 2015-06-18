/*
 * Copyright (C) 2015 Michael Martinez
 * Changes: Added support for selection values 2-7, fixed minor bugs &
 * warnings, split into multiple class files, and general clean up.
 */

/*
 * Copyright (C) 2003-2009 JNode.org
 * Original source: http://webuser.fh-furtwangen.de/~dersch/
 * Changed License to LGPL with the friendly permission of Helmut Dersch.
 */

/*
 * Copyright (C) Helmut Dersch
 *
 * This library is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public
 * License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; If not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/*jslint browser: true, node: true */
/*global require, module */

"use strict";

/*** Imports ***/
var jpeg = jpeg || {};
jpeg.lossless = jpeg.lossless || {};
jpeg.lossless.ComponentSpec = jpeg.lossless.ComponentSpec || ((typeof require !== 'undefined') ? require('./component-spec.js') : null);
jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);


/*** Constructor ***/
jpeg.lossless.FrameHeader = jpeg.lossless.FrameHeader || function () {
    this.components = []; // Components
    this.dimX = 0; // Number of samples per line
    this.dimY = 0; // Number of lines
    this.numComp = 0; // Number of component in the frame
    this.precision = 0; // Sample Precision (from the original image)
};



/*** Prototype Methods ***/

jpeg.lossless.FrameHeader.prototype.read = function (data) {
    /*jslint bitwise: true */

    var count = 0, length, i, c, temp;

    length = data.get16();
    count += 2;

    this.precision = data.get8();
    count+=1;

    this.dimY = data.get16();
    count += 2;

    this.dimX = data.get16();
    count += 2;

    this.numComp = data.get8();
    count+=1;
    for (i = 1; i <= this.numComp; i+=1) {
        if (count > length) {
            throw new Error("ERROR: frame format error");
        }

        c = data.get8();
        count+=1;

        if (count >= length) {
            throw new Error("ERROR: frame format error [c>=Lf]");
        }

        temp = data.get8();
        count+=1;

        if (!this.components[c]) {
            this.components[c] = new jpeg.lossless.ComponentSpec();
        }

        this.components[c].hSamp = temp >> 4;
        this.components[c].vSamp = temp & 0x0F;
        this.components[c].quantTableSel = data.get8();
        count+=1;
    }

    if (count !== length) {
        throw new Error("ERROR: frame format error [Lf!=count]");
    }

    return 1;
};


/*** Exports ***/

var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.FrameHeader;
}
