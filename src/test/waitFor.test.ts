import { expect, test, vi } from 'vitest';
import { waitFor } from '../main/index.js';

test('first callback invocation in synchronous', async () => {
  const cbMock = vi.fn(() => true);

  await waitFor(cbMock);

  expect(cbMock).toHaveBeenCalledTimes(1);
});

test('invokes callback until truthy value is returned', async () => {
  const cbMock = vi.fn();

  cbMock.mockImplementationOnce(() => false);
  cbMock.mockImplementationOnce(() => '');
  cbMock.mockImplementationOnce(() => 0);
  cbMock.mockImplementationOnce(() => null);
  cbMock.mockImplementationOnce(() => undefined);
  cbMock.mockImplementationOnce(() => 'aaa');

  await expect(waitFor(cbMock)).resolves.toBe('aaa');

  expect(cbMock).toHaveBeenCalledTimes(6);
});

test('rejects if callback throws', async () => {
  await expect(
    waitFor(() => {
      throw new Error('expected');
    })
  ).rejects.toEqual(new Error('expected'));
});

test('rejects if callback returns a rejected promise', async () => {
  await expect(waitFor(() => Promise.reject(111))).rejects.toBe(111);
});

test('resolves with returned value', async () => {
  await expect(waitFor(() => 111)).resolves.toEqual(111);
});

test('resolves if callback returns a fulfilled promise', async () => {
  await expect(waitFor(() => Promise.resolve(111))).resolves.toEqual(111);
});

test('rejects if ms callback throws', async () => {
  await expect(
    waitFor(
      () => false,
      () => {
        throw new Error('expected');
      }
    )
  ).rejects.toEqual(new Error('expected'));
});

test('passes value to ms callback on resolve', async () => {
  const cbMock = vi.fn();
  const msMock = vi.fn();

  cbMock.mockImplementationOnce(() => '');
  cbMock.mockImplementationOnce(() => true);

  await waitFor(cbMock, msMock);

  expect(msMock).toHaveBeenCalledTimes(1);
  expect(msMock).toHaveBeenNthCalledWith(1, '', 0);
});
