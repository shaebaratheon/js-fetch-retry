/**
 * Case-Insensitive Multi-Value HTTP Headers Bag.
 */

class HeadersBag {
  constructor(init = {}) {
    this._map = new Map();
    if (init) {
      if (init instanceof HeadersBag) {
        init.forEach((v, k) => this.set(k, v));
      } else if (Array.isArray(init)) {
        init.forEach(([k, v]) => this.append(k, v));
      } else {
        Object.entries(init).forEach(([k, v]) => this.set(k, v));
      }
    }
  }

  set(name, value) {
    const key = name.toLowerCase();
    this._map.set(key, { rawName: name, values: [String(value)] });
  }

  append(name, value) {
    const key = name.toLowerCase();
    const existing = this._map.get(key);
    if (existing) {
      existing.values.push(String(value));
    } else {
      this._map.set(key, { rawName: name, values: [String(value)] });
    }
  }

  get(name) {
    const entry = this._map.get(name.toLowerCase());
    return entry ? entry.values.join(", ") : null;
  }

  has(name) {
    return this._map.has(name.toLowerCase());
  }

  delete(name) {
    return this._map.delete(name.toLowerCase());
  }

  forEach(callback) {
    this._map.forEach((entry, key) => {
      callback(entry.values.join(", "), entry.rawName, this);
    });
  }

  toObject() {
    const obj = {};
    this.forEach((val, name) => {
      obj[name] = val;
    });
    return obj;
  }
}

module.exports = { HeadersBag };
