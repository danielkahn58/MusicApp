import { describe, expect, it } from 'vitest';
import { mapGetUserMediaError, checkMicSupport, checkPermissionsPolicy, isEmbedded } from '../src/audio/mic';

function domException(name: string): DOMException {
  return new DOMException('boom', name);
}

describe('mic error mapping', () => {
  it('maps permission-denied errors', () => {
    expect(mapGetUserMediaError(domException('NotAllowedError'), false)).toMatch(/blocked/i);
    expect(mapGetUserMediaError(domException('SecurityError'), false)).toMatch(/blocked/i);
  });

  it('gives an iframe-specific message when embedded', () => {
    const msg = mapGetUserMediaError(domException('NotAllowedError'), true);
    expect(msg).toMatch(/embedded/i);
  });

  it('maps missing/overconstrained device errors', () => {
    expect(mapGetUserMediaError(domException('NotFoundError'), false)).toMatch(/no microphone/i);
    expect(mapGetUserMediaError(domException('OverconstrainedError'), false)).toMatch(/no microphone/i);
  });

  it('falls back to a generic message for unknown errors', () => {
    const msg = mapGetUserMediaError(domException('SomeWeirdError'), false);
    expect(msg).toMatch(/could not start/i);
    expect(msg).toContain('SomeWeirdError');
  });

  it('flags browsers without mediaDevices support', () => {
    const fakeNav = {} as Navigator;
    expect(checkMicSupport(fakeNav)).toMatch(/cannot open a microphone/i);
  });

  it('passes when getUserMedia is present', () => {
    const fakeNav = { mediaDevices: { getUserMedia: async () => ({}) as MediaStream } } as unknown as Navigator;
    expect(checkMicSupport(fakeNav)).toBeNull();
  });

  it('flags a permissions-policy block', () => {
    const fakeDoc = {
      permissionsPolicy: { allowsFeature: () => false },
    } as unknown as Document;
    expect(checkPermissionsPolicy(fakeDoc)).toMatch(/does not allow microphone/i);
  });

  it('passes when permissions policy allows the microphone', () => {
    const fakeDoc = {
      permissionsPolicy: { allowsFeature: () => true },
    } as unknown as Document;
    expect(checkPermissionsPolicy(fakeDoc)).toBeNull();
  });

  it('detects being embedded in an iframe', () => {
    const sameWindow: { self: unknown; top: unknown } = { self: null, top: null };
    sameWindow.self = sameWindow;
    sameWindow.top = sameWindow;
    expect(isEmbedded(sameWindow)).toBe(false);

    const framedWindow: { self: unknown; top: unknown } = { self: null, top: null };
    framedWindow.self = framedWindow;
    framedWindow.top = {};
    expect(isEmbedded(framedWindow)).toBe(true);
  });
});
