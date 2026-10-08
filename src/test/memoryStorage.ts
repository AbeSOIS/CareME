/** Minimal in-memory Storage for running the mock API under Node. */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
}

export function installMemoryStorage(): MemoryStorage {
  const local = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true })
  Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true })
  return local
}
