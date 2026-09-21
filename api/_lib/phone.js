// Normalize any phone-ish string to E.164 with a US default country code.
// Handles: "+19177790946", "9177790946", "(917) 779-0946", "1-917-779-0946".
// Anything without at least 10 digits after cleanup returns null.
export function toE164(input, defaultCountry = '+1') {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (hadPlus) return `+${digits}`;
  // Handle "1XXXXXXXXXX" (US with country prefix but no +)
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  // Anything else — trust the digits and prepend + if it looks international-ish
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// Our own ClickSend number, used as the `from` on every outbound.
export const OUR_NUMBER = '+19177790946';
