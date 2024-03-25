declare const ComponentSpec: {
    hSamp: number;
    quantTableSel: number;
    vSamp: number;
};

declare class DataStream {
    buffer: Uint8Array;
    index: number;
    constructor(data: ArrayBuffer, offset?: number, length?: number);
    get16(): number;
    get8(): number;
}

declare class FrameHeader {
    dimX: number;
    dimY: number;
    numComp: number;
    precision: number;
    components: Array<typeof ComponentSpec>;
    read(data: DataStream): number;
}

declare class HuffmanTable {
    static MSB: number;
    l: number[][][];
    th: number[];
    v: number[][][][];
    tc: number[][];
    constructor();
    read(data: DataStream, HuffTab: number[][][]): number;
    buildHuffTable(tab: number[], L: number[], V: number[][]): void;
}

declare class QuantizationTable {
    precision: number[];
    tq: number[];
    quantTables: number[][];
    static enhanceQuantizationTable: (qtab: number[], table: number[]) => void;
    read(data: DataStream, table: number[]): number;
}

declare const ScanComponent: {
    acTabSel: number;
    dcTabSel: number;
    scanCompSel: number;
};

declare class ScanHeader {
    ah: number;
    al: number;
    numComp: number;
    selection: number;
    spectralEnd: number;
    components: Array<typeof ScanComponent>;
    read(data: DataStream): number;
}

declare class Decoder {
    static IDCT_P: number[];
    static TABLE: number[];
    static MAX_HUFFMAN_SUBTREE: number;
    static MSB: number;
    static RESTART_MARKER_BEGIN: number;
    static RESTART_MARKER_END: number;
    buffer: ArrayBuffer | null;
    stream: DataStream | null;
    frame: FrameHeader;
    huffTable: HuffmanTable;
    quantTable: QuantizationTable;
    scan: ScanHeader;
    DU: number[][][];
    HuffTab: number[][][];
    IDCT_Source: number[];
    nBlock: number[];
    acTab: number[][];
    dcTab: number[][];
    qTab: number[][];
    marker: number;
    markerIndex: number;
    numComp: number;
    restartInterval: number;
    selection: number;
    xDim: number;
    yDim: number;
    xLoc: number;
    yLoc: number;
    outputData: Uint8Array | Uint16Array | null;
    restarting: boolean;
    mask: number;
    numBytes: number;
    precision: number | undefined;
    components: Array<typeof ComponentSpec>;
    getter: null | ((index: number, compOffset: number) => number);
    setter: null | ((index: number, val: number, compOffset?: number) => void);
    output: null | ((PRED: number[]) => void);
    selector: null | ((compOffset?: number) => number);
    /**
     * The Decoder constructor.
     * @property {number} numBytes - number of bytes per component
     * @type {Function}
     */
    constructor(buffer?: ArrayBuffer | null, numBytes?: number);
    /**
     * Returns decompressed data.
     */
    decompress(buffer: ArrayBuffer, offset: number, length: number): ArrayBuffer;
    decode(buffer?: ArrayBuffer, offset?: number, length?: number, numBytes?: number): Uint8Array | Uint16Array;
    decodeUnit(prev: number[], temp: number[], index: number[]): number;
    select1(compOffset?: number): number;
    select2(compOffset?: number): number;
    select3(compOffset?: number): number;
    select4(compOffset?: number): number;
    select5(compOffset?: number): number;
    select6(compOffset?: number): number;
    select7(compOffset?: number): number;
    decodeRGB(prev: number[], temp: number[], index: number[]): number;
    decodeSingle(prev: number[], temp: number[], index: number[]): number;
    getHuffmanValue(table: number[], temp: number[], index: number[]): number;
    getn(PRED: number[], n: number, temp: number[], index: number[]): number;
    getPreviousX(compOffset?: number): number;
    getPreviousXY(compOffset?: number): number;
    getPreviousY(compOffset?: number): number;
    isLastPixel(): boolean;
    outputSingle(PRED: number[]): void;
    outputRGB(PRED: number[]): void;
    setValue8(index: number, val: number): void;
    getValue8(index: number): number;
    setValueRGB(index: number, val: number, compOffset?: number): void;
    getValueRGB(index: number, compOffset: number): number;
    readApp(): number | null;
    readComment(): string | null;
    readNumber(): number | null;
}

type NestedArray<T> = Array<T | NestedArray<T>>;
declare const createArray: (...dimensions: number[]) => NestedArray<number>;
declare const makeCRCTable: () => number[];
declare const crcTable: number[];
declare const crc32: (buffer: ArrayBuffer) => number;

declare const utils_crc32: typeof crc32;
declare const utils_crcTable: typeof crcTable;
declare const utils_createArray: typeof createArray;
declare const utils_makeCRCTable: typeof makeCRCTable;
declare namespace utils {
  export { utils_crc32 as crc32, utils_crcTable as crcTable, utils_createArray as createArray, utils_makeCRCTable as makeCRCTable };
}

export { ComponentSpec, DataStream, Decoder, FrameHeader, HuffmanTable, QuantizationTable, ScanComponent, ScanHeader, utils as Utils };
