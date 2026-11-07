import { createSessionStorage, type SessionStorage } from '../sessionStorage';

function backingStore() {
  const data = new Map<string, string>();
  let fail = '';
  const backend: SessionStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      if (key === fail) throw new Error('Keystore write failed');
      if (Buffer.byteLength(value, 'utf8') > 2048) throw new Error('Keystore item is too large');
      data.set(key, value);
    },
    removeItem: async (key) => { data.delete(key); },
  };
  return { data, backend, failOn: (key: string) => { fail = key; } };
}

test('stores and restores a large Unicode session within secure item size limits', async () => {
  const { data, backend } = backingStore();
  const storage = createSessionStorage(backend);
  const session = JSON.stringify({ access_token: 'x'.repeat(3600), user: { name: '😀日本語'.repeat(350) } });
  await storage.setItem('session', session);
  expect(data.size).toBeGreaterThan(4);
  expect(await createSessionStorage(backend).getItem('session')).toBe(session);
  await storage.removeItem('session');
  expect(await storage.getItem('session')).toBeNull();
  expect(data.size).toBe(0);
});

test('retains the previous session if a refresh is interrupted before the pointer changes', async () => {
  const { backend, data, failOn } = backingStore();
  const storage = createSessionStorage(backend);
  await storage.setItem('session', 'old token');
  failOn('session.b.1');
  await expect(storage.setItem('session', 'new'.repeat(500))).rejects.toThrow('Keystore write failed');
  expect(await storage.getItem('session')).toBe('old token');
  await storage.removeItem('session');
  expect(data.size).toBe(0);
});
