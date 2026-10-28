import { maskEmail, maskPhone } from './masking';
describe('response-only masking', () => {
  it('handles empty, short, Unicode and malformed emails', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail('')).toBe('');
    expect(maskEmail('a@b.com')).toBe('***@b.com');
    expect(maskEmail('陈阳@example.com')).toBe('陈***@example.com');
    expect(maskEmail('broken')).toBe('***');
  });
  it('reveals at most four digits only for longer phone numbers', () => {
    expect(maskPhone('+852 12345678')).toBe('***5678');
    expect(maskPhone('1234')).toBe('***');
    expect(maskPhone('invalid')).toBe('***');
  });
});
