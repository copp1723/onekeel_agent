/**
 * Output Storage Module
 *
 * This module provides functionality to save output results to structured
 * directories for tracking and comparison.
 */
/**
 * Creates a structured path for storing results
 * @param platform - Platform name (e.g., 'VinSolutions')
 * @param dateStr - Optional date string (defaults to current date in YYYY-MM-DD format)
 * @param filename - Filename for the result
 * @returns Full path to store the result
 */
export declare function createResultPath(platform: string, filename: string, dateStr?: string): string;
/**
 * Save result to a structured directory
 * @param platform - Platform name (e.g., 'VinSolutions')
 * @param result - Result data to save
 * @param filename - Filename for the result (without extension)
 * @param metadata - Optional metadata to include
 * @returns Path to the saved file
 */
export declare function saveResult(platform: string, result: any, filename: string, metadata?: Record<string, any>): string;
/**
 * Load a previously saved result
 * @param filepath - Path to the result file
 * @returns Loaded result data
 */
export declare function loadResult(filepath: string): any;
