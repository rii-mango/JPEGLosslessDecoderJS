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
jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
jpeg.lossless.ScanComponent = jpeg.lossless.ScanComponent || ((typeof require !== 'undefined') ? require('./scan-component.js') : null);


/*** Constructor ***/
jpeg.lossless.ScanHeader = jpeg.lossless.ScanHeader || function () {
    this.ah = 0;
    this.al = 0;
    this.numComp = 0; // Number of components in the scan
    this.selection = 0; // Start of spectral or predictor selection
    this.spectralEnd = 0; // End of spectral selection
    this.components = [];
};


/*** Prototype Methods ***/

jpeg.lossless.ScanHeader.prototype.read = function(data) {
    /*jslint bitwise: true */

    var count = 0, length, i, temp;

    length = data.get16();
    count += 2;

    this.numComp = data.get8();
    count+=1;

    for (i = 0; i < this.numComp; i+=1) {
        this.components[i] = new jpeg.lossless.ScanComponent();

        if (count > length) {
            throw new Error("ERROR: scan header format error");
        }

        this.components[i].scanCompSel = data.get8();
        count+=1;

        temp = data.get8();
        count+=1;

        this.components[i].dcTabSel = (temp >> 4);
        this.components[i].acTabSel = (temp & 0x0F);
    }

    this.selection = data.get8();
    count+=1;

    this.spectralEnd = data.get8();
    count+=1;

    temp = data.get8();
    this.ah = (temp >> 4);
    this.al = (temp & 0x0F);
    count+=1;

    if (count !== length) {
        throw new Error("ERROR: scan header format error [count!=Ns]");
    }

    return 1;
};



/*** Exports ***/

var moduleType = typeof module;
if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.ScanHeader;
}
