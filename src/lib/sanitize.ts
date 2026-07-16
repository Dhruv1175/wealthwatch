import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes input string to prevent HTML/XML/XSS injection.
 * Strips all HTML tags and attributes entirely.
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Block all HTML tags
    ALLOWED_ATTR: [], // Block all attributes
  });
}
