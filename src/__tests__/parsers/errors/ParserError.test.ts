/**
 * Tests for Parser Error Classes
 */

import { 
  ParserError, 
  ValidationError, 
  FileNotFoundError, 
  UnsupportedFileTypeError,
  ParseError
} from '../../../parsers/errors/ParserError.js';

describe('ParserError', () => {
  it('should create a basic parser error', () => {
    const error = new ParserError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ParserError);
    expect(error.name).toBe('ParserError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('PARSER_ERROR');
    expect(error.context).toEqual({});
  });
  
  it('should create a parser error with custom code', () => {
    const error = new ParserError('Test error', 'CUSTOM_CODE');
    
    expect(error.code).toBe('CUSTOM_CODE');
  });
  
  it('should create a parser error with context', () => {
    const context = { foo: 'bar' };
    const error = new ParserError('Test error', 'PARSER_ERROR', context);
    
    expect(error.context).toEqual(context);
  });
  
  it('should add context to an existing error', () => {
    const error = new ParserError('Test error');
    error.withContext({ foo: 'bar' });
    
    expect(error.context).toEqual({ foo: 'bar' });
    
    // Add more context
    error.withContext({ baz: 'qux' });
    
    expect(error.context).toEqual({ foo: 'bar', baz: 'qux' });
  });
  
  it('should convert to JSON', () => {
    const error = new ParserError('Test error', 'CUSTOM_CODE', { foo: 'bar' });
    const json = error.toJSON();
    
    expect(json).toEqual({
      name: 'ParserError',
      message: 'Test error',
      code: 'CUSTOM_CODE',
      context: { foo: 'bar' },
      stack: error.stack,
    });
  });
});

describe('ValidationError', () => {
  it('should create a validation error', () => {
    const error = new ValidationError('Validation failed');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ParserError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.context).toEqual({});
  });
  
  it('should create a validation error with context', () => {
    const context = { field: 'username', reason: 'too short' };
    const error = new ValidationError('Validation failed', context);
    
    expect(error.context).toEqual(context);
  });
});

describe('FileNotFoundError', () => {
  it('should create a file not found error', () => {
    const filePath = '/path/to/file.txt';
    const error = new FileNotFoundError(filePath);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ParserError);
    expect(error).toBeInstanceOf(FileNotFoundError);
    expect(error.name).toBe('FileNotFoundError');
    expect(error.message).toBe('File not found: /path/to/file.txt');
    expect(error.code).toBe('FILE_NOT_FOUND');
    expect(error.context).toEqual({ filePath });
  });
  
  it('should create a file not found error with additional context', () => {
    const filePath = '/path/to/file.txt';
    const context = { attemptCount: 3 };
    const error = new FileNotFoundError(filePath, context);
    
    expect(error.context).toEqual({ filePath, ...context });
  });
});

describe('UnsupportedFileTypeError', () => {
  it('should create an unsupported file type error', () => {
    const fileType = 'xyz';
    const error = new UnsupportedFileTypeError(fileType);
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ParserError);
    expect(error).toBeInstanceOf(UnsupportedFileTypeError);
    expect(error.name).toBe('UnsupportedFileTypeError');
    expect(error.message).toBe('Unsupported file type: xyz');
    expect(error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(error.context).toEqual({ fileType });
  });
  
  it('should create an unsupported file type error with supported types', () => {
    const fileType = 'xyz';
    const context = { supportedTypes: ['csv', 'xlsx'] };
    const error = new UnsupportedFileTypeError(fileType, context);
    
    expect(error.context).toEqual({ fileType, ...context });
  });
});

describe('ParseError', () => {
  it('should create a parse error', () => {
    const error = new ParseError('Failed to parse content');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ParserError);
    expect(error).toBeInstanceOf(ParseError);
    expect(error.name).toBe('ParseError');
    expect(error.message).toBe('Failed to parse content');
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.context).toEqual({});
  });
  
  it('should create a parse error with context', () => {
    const context = { line: 42, column: 10 };
    const error = new ParseError('Failed to parse content', context);
    
    expect(error.context).toEqual(context);
  });
});
