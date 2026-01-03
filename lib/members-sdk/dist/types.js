"use strict";
/**
 * Type definitions for Clinio Members SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinioError = void 0;
// ============================================
// Error Types
// ============================================
class ClinioError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'ClinioError';
        this.code = code;
        this.details = details;
    }
}
exports.ClinioError = ClinioError;
