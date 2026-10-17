import { describe, expect, it } from 'vitest';
import { ROOM_CODE_LENGTH } from '../constants';
import { generateRoomCode, isConnectedAt, isValidRoomCode, normalizeNickname, normalizeRoomCode, pickNewHost } from '../room';
import { seededRng } from '../rng';
import { DEFAULT_SETTINGS, resolveSettings } from '../settings';
import { formatYen, topicText } from '../topic';

describe('ルームコード', () => {
  it('6文字で、紛らわしい文字を含まない', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 500; i++) {
      const code = generateRoomCode(rng);
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(code).not.toMatch(/[0O1IL]/);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it('入力を正規化する', () => {
    expect(normalizeRoomCode(' abc-def ')).toBe('ABCDEF');
    expect(isValidRoomCode('ABCDE0')).toBe(false);
    expect(isValidRoomCode('ABCDE')).toBe(false);
  });
});

describe('normalizeNickname', () => {
  it('前後の空白を取り、1〜12文字を許可する', () => {
    expect(normalizeNickname('  たろう  ')).toBe('たろう');
    expect(normalizeNickname('')).toBeNull();
    expect(normalizeNickname('   ')).toBeNull();
    expect(normalizeNickname('あいうえおかきくけこさし')).toBe('あいうえおかきくけこさし');
    expect(normalizeNickname('あいうえおかきくけこさしす')).toBeNull();
    expect(normalizeNickname('a\u0007b')).toBeNull();
  });
});

describe('接続とホスト移譲', () => {
  it('25秒途絶えたら切断扱い', () => {
    expect(isConnectedAt(0, 24_999)).toBe(true);
    expect(isConnectedAt(0, 25_000)).toBe(false);
  });

  const ps = [
    { id: 'h', seatOrder: 0, connected: false, left: false },
    { id: 'a', seatOrder: 2, connected: true, left: false },
    { id: 'b', seatOrder: 1, connected: true, left: false },
  ];
  it('ホストが切断したら seat_order が最小の接続中の人へ', () => {
    expect(pickNewHost(ps, 'h')).toBe('b');
  });
  it('ホストが接続中なら移さない', () => {
    expect(pickNewHost(ps.map((p) => ({ ...p, connected: true })), 'h')).toBeNull();
  });
  it('候補がいなければ null', () => {
    expect(pickNewHost(ps.map((p) => ({ ...p, connected: false })), 'h')).toBeNull();
  });
});

describe('設定', () => {
  it('未指定は既定値で補う', () => {
    expect(resolveSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings({ targetScore: 5, prepSeconds: null })).toMatchObject({ targetScore: 5, prepSeconds: null });
  });
  it('範囲外はエラー', () => {
    expect(() => resolveSettings({ targetScore: 11 })).toThrow();
    expect(() => resolveSettings({ prepSeconds: 10 })).toThrow();
    expect(() => resolveSettings({ pitchSeconds: 181 })).toThrow();
  });
});

describe('お題の文面', () => {
  it('価格を読みやすく表示する', () => {
    expect(formatYen(300)).toBe('300円');
    expect(formatYen(3000)).toBe('3,000円');
    expect(formatYen(10000)).toBe('1万円');
    expect(formatYen(15000)).toBe('1万5,000円');
    expect(formatYen(1000000)).toBe('100万円');
  });
  it('価格表示のON/OFF', () => {
    expect(topicText({ item: 'ビニール傘', price: 50000 }, true)).toBe('このビニール傘を5万円で売ってください');
    expect(topicText({ item: 'ビニール傘', price: 50000 }, false)).toBe('このビニール傘を売ってください');
  });
});
