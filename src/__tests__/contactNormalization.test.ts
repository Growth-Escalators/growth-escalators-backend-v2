import { describe, it, expect } from 'vitest';
import { normalizeChannelValue, normalizeChannel } from '../services/contactService';

// Guards the contact-dedup invariant from CLAUDE.md: email must be
// lowercased+trimmed, phone/whatsapp must be digits-only with `91` prefix.
// If this test starts failing, payment routes will fragment contacts.

describe('normalizeChannelValue', () => {
  describe('email', () => {
    it('lowercases', () => {
      expect(normalizeChannelValue('email', 'Jatin@X.COM')).toBe('jatin@x.com');
    });

    it('trims surrounding whitespace', () => {
      expect(normalizeChannelValue('email', '  user@x.com  ')).toBe('user@x.com');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeChannelValue('email', '')).toBe('');
    });
  });

  describe('whatsapp / phone / sms', () => {
    it('strips non-digits and prefixes 91', () => {
      expect(normalizeChannelValue('whatsapp', '+91 98765-43210')).toBe('919876543210');
    });

    it('keeps 91 prefix if already present', () => {
      expect(normalizeChannelValue('whatsapp', '919876543210')).toBe('919876543210');
    });

    it('adds 91 prefix when missing', () => {
      expect(normalizeChannelValue('whatsapp', '9876543210')).toBe('919876543210');
    });

    it('handles phone channelType the same way', () => {
      expect(normalizeChannelValue('phone', '9876543210')).toBe('919876543210');
    });

    it('returns empty string for non-digit input', () => {
      expect(normalizeChannelValue('whatsapp', '+--')).toBe('');
    });
  });

  it('leaves unknown channel types alone except for trim', () => {
    expect(normalizeChannelValue('discord', '  user#1234  ')).toBe('user#1234');
  });
});

describe('normalizeChannel', () => {
  it('returns the channel with its value normalized', () => {
    expect(normalizeChannel({ channelType: 'email', channelValue: 'A@B.COM', isPrimary: true }))
      .toEqual({ channelType: 'email', channelValue: 'a@b.com', isPrimary: true });
  });

  it('preserves isPrimary flag', () => {
    expect(normalizeChannel({ channelType: 'whatsapp', channelValue: '9876543210', isPrimary: true }))
      .toEqual({ channelType: 'whatsapp', channelValue: '919876543210', isPrimary: true });
  });
});
