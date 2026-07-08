/* JingZen Translate - LRU translation cache */

export class TranslationCache {
  constructor(maxSize = 500) {
    this.map = new Map();
    this.maxSize = maxSize;
  }

  _key(text, sourceLang, targetLang) {
    return `${sourceLang || 'auto'}:${targetLang}:${text}`;
  }

  get(text, sourceLang, targetLang) {
    const k = this._key(text, sourceLang, targetLang);
    if (!this.map.has(k)) return null;
    // Move to end (most recently used)
    const v = this.map.get(k);
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }

  set(text, sourceLang, targetLang, translation) {
    const k = this._key(text, sourceLang, targetLang);
    if (this.map.has(k)) this.map.delete(k);
    else if (this.map.size >= this.maxSize) {
      // Evict oldest (first inserted)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(k, translation);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

// Singleton instance for the extension
export const translationCache = new TranslationCache();
