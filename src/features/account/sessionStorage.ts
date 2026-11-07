export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const CHARS_PER_CHUNK = 400;
const MAX_CHUNKS = 64;
type Slot = 'a' | 'b';

// A full auth session can exceed a SecureStore item's size limit. Write the new
// encrypted chunks first, then switch the pointer so an interrupted write keeps
// the previous session readable. All keys are private to this installation.
export function createSessionStorage(secure: SessionStorage): SessionStorage {
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(fn: () => Promise<T>) {
    const next = tail.then(fn);
    tail = next.catch(() => {});
    return next;
  }
  const activeKey = (key: string) => key + '.current';
  const countKey = (key: string, slot: Slot) => key + '.' + slot + '.count';
  const partKey = (key: string, slot: Slot, index: number) => key + '.' + slot + '.' + index;

  async function count(key: string, slot: Slot) {
    const size = Number(await secure.getItem(countKey(key, slot)));
    return Number.isInteger(size) && size > 0 && size <= MAX_CHUNKS ? size : 0;
  }

  async function removeSlot(key: string, slot: Slot) {
    const size = await count(key, slot);
    for (let i = 0; i < size; i++) await secure.removeItem(partKey(key, slot, i));
    await secure.removeItem(countKey(key, slot));
  }

  return {
    getItem: (key) => serial(async () => {
      const slot = await secure.getItem(activeKey(key));
      if (slot !== 'a' && slot !== 'b') return null;
      const size = await count(key, slot);
      if (!size) return null;
      const parts = await Promise.all(Array.from({ length: size }, (_, i) => secure.getItem(partKey(key, slot, i))));
      return parts.some((part) => part === null) ? null : parts.join('');
    }),
    setItem: (key, value) => serial(async () => {
      const characters = Array.from(value);
      const parts: string[] = [];
      for (let i = 0; i < characters.length; i += CHARS_PER_CHUNK) {
        parts.push(characters.slice(i, i + CHARS_PER_CHUNK).join(''));
      }
      if (!parts.length) parts.push('');
      if (parts.length > MAX_CHUNKS) throw new Error('Session is too large to store securely');
      const previous = await secure.getItem(activeKey(key));
      const slot = previous === 'a' ? 'b' : 'a';
      await removeSlot(key, slot);
      await secure.setItem(countKey(key, slot), String(parts.length));
      for (const [i, part] of parts.entries()) await secure.setItem(partKey(key, slot, i), part);
      await secure.setItem(activeKey(key), slot);
      if (previous === 'a' || previous === 'b') await removeSlot(key, previous).catch(() => {});
    }),
    removeItem: (key) => serial(async () => {
      await removeSlot(key, 'a');
      await removeSlot(key, 'b');
      await secure.removeItem(activeKey(key));
    }),
  };
}
