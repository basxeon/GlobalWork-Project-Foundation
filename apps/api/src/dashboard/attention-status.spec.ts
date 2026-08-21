import {
  passportAttentionStatus,
  taskAttentionStatus,
} from './attention-status';

describe('attention status rules', () => {
  const today = new Date('2026-08-03T12:00:00.000Z');

  it('categorizes passport expiry dates at the approved boundaries', () => {
    expect(passportAttentionStatus('2026-08-02', today)).toBe('EXPIRED');
    expect(passportAttentionStatus('2026-09-02', today)).toBe('URGENT');
    expect(passportAttentionStatus('2026-09-03', today)).toBe('UPCOMING');
    expect(passportAttentionStatus('2026-11-01', today)).toBe('UPCOMING');
    expect(passportAttentionStatus('2026-11-02', today)).toBe('OK');
    expect(passportAttentionStatus(null, today)).toBe('OK');
  });

  it('categorizes active task due dates and excludes completed tasks', () => {
    expect(taskAttentionStatus('2026-08-02', 'OPEN', today)).toBe('OVERDUE');
    expect(taskAttentionStatus('2026-08-10', 'OPEN', today)).toBe('DUE_SOON');
    expect(taskAttentionStatus('2026-08-11', 'OPEN', today)).toBe('OK');
    expect(taskAttentionStatus('2026-08-02', 'COMPLETED', today)).toBe('OK');
  });

  it('uses the configured timezone at a UTC day boundary', () => {
    const bangkokMorning = new Date('2026-08-03T18:00:00.000Z');

    expect(
      passportAttentionStatus('2026-08-03', bangkokMorning, 'Asia/Bangkok'),
    ).toBe('EXPIRED');
    expect(
      taskAttentionStatus('2026-08-03', 'OPEN', bangkokMorning, 'Asia/Bangkok'),
    ).toBe('OVERDUE');
    expect(
      taskAttentionStatus('2026-08-03', 'OPEN', bangkokMorning, 'UTC'),
    ).toBe('DUE_SOON');
  });
});
