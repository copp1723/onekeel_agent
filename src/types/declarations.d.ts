declare module 'pdf-parse' {
  interface PDFParseOptions {
    pagerender?: (pageData: any) => string;
    max?: number;
  }
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }
  function PDFParse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFParseResult>;
  export = PDFParse;
}
declare module 'rotating-file-stream' {
  interface RotatingFileStreamOptions {
    size?: string;
    interval?: string;
    path?: string;
    maxFiles?: number;
    compress?: boolean | 'gzip';
    mode?: number;
    history?: string;
  }
  function createStream(
    filename: string | ((time: number | Date, index?: number) => string),
    options?: RotatingFileStreamOptions
  ): NodeJS.WritableStream;
  export = createStream;
}
