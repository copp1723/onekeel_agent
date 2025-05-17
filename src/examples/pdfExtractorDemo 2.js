"use strict";
/**
 * PDF Extractor Demo
 *
 * This script demonstrates the usage of the PDF extraction adapter.
 * It extracts tables from a PDF file using both lattice and stream modes.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var pdfExtractor_js_1 = require("../utils/pdfExtractor.js");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var pdfFilePath, autoResult, latticeResult, streamResult, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    pdfFilePath = path_1.default.join(process.cwd(), 'real data files', 'Vinconnect APPT PERFORMANCE.pdf');
                    // Check if the file exists
                    if (!fs_1.default.existsSync(pdfFilePath)) {
                        console.error("File not found: ".concat(pdfFilePath));
                        return [2 /*return*/];
                    }
                    console.log("Extracting tables from: ".concat(pdfFilePath));
                    // Extract tables using AUTO mode
                    console.log('\n=== AUTO MODE ===');
                    return [4 /*yield*/, (0, pdfExtractor_js_1.extractTablesFromPDFFile)(pdfFilePath, {
                            mode: pdfExtractor_js_1.PDFExtractionMode.AUTO,
                            minConfidence: 0.5,
                        })];
                case 1:
                    autoResult = _a.sent();
                    console.log("Success: ".concat(autoResult.success));
                    console.log("Extraction Mode Used: ".concat(autoResult.metadata.extractionMode));
                    console.log("Tables Found: ".concat(autoResult.metadata.tableCount));
                    console.log("Confidence: ".concat(autoResult.metadata.confidence.toFixed(2)));
                    if (autoResult.tables.length > 0) {
                        console.log('\nFirst Table Sample (first 3 records):');
                        console.log(JSON.stringify(autoResult.tables[0].slice(0, 3), null, 2));
                    }
                    else {
                        console.log('No tables found in AUTO mode.');
                    }
                    // Extract tables using LATTICE mode
                    console.log('\n=== LATTICE MODE ===');
                    return [4 /*yield*/, (0, pdfExtractor_js_1.extractTablesFromPDFFile)(pdfFilePath, {
                            mode: pdfExtractor_js_1.PDFExtractionMode.LATTICE,
                            minConfidence: 0.5,
                        })];
                case 2:
                    latticeResult = _a.sent();
                    console.log("Success: ".concat(latticeResult.success));
                    console.log("Tables Found: ".concat(latticeResult.metadata.tableCount));
                    console.log("Confidence: ".concat(latticeResult.metadata.confidence.toFixed(2)));
                    if (latticeResult.tables.length > 0) {
                        console.log('\nFirst Table Sample (first 3 records):');
                        console.log(JSON.stringify(latticeResult.tables[0].slice(0, 3), null, 2));
                    }
                    else {
                        console.log('No tables found in LATTICE mode.');
                    }
                    // Extract tables using STREAM mode
                    console.log('\n=== STREAM MODE ===');
                    return [4 /*yield*/, (0, pdfExtractor_js_1.extractTablesFromPDFFile)(pdfFilePath, {
                            mode: pdfExtractor_js_1.PDFExtractionMode.STREAM,
                            minConfidence: 0.5,
                        })];
                case 3:
                    streamResult = _a.sent();
                    console.log("Success: ".concat(streamResult.success));
                    console.log("Tables Found: ".concat(streamResult.metadata.tableCount));
                    console.log("Confidence: ".concat(streamResult.metadata.confidence.toFixed(2)));
                    if (streamResult.tables.length > 0) {
                        console.log('\nFirst Table Sample (first 3 records):');
                        console.log(JSON.stringify(streamResult.tables[0].slice(0, 3), null, 2));
                    }
                    else {
                        console.log('No tables found in STREAM mode.');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('Error in PDF extraction demo:');
                    console.error(error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Run the demo
main().catch(console.error);
