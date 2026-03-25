class CacheService {
  constructor() {
    this.prefix = 'yourtime_';
    this.defaultTTL = 5 * 60 * 1000;
  }
  generateKey(key, userId) {
    if (!userId) {
      return `${this.prefix}${key}`;
    }
    return `${this.prefix}${userId}_${key}`;
  }
  set(key, data, userId, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateKey(key, userId);
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        userId,
        version: '1.0'
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.clearExpired();
      }
      return false;
    }
  }
  get(key, userId, validateUser = true) {
    try {
      const cacheKey = this.generateKey(key, userId);
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;
      const cacheData = JSON.parse(cached);
      if (validateUser && cacheData.userId !== userId) {
        this.remove(key, userId);
        return null;
      }
      if (Date.now() > cacheData.expiresAt) {
        this.remove(key, userId);
        return null;
      }
      return cacheData.data;
    } catch (error) {
      return null;
    }
  }
  remove(key, userId) {
    try {
      const cacheKey = this.generateKey(key, userId);
      sessionStorage.removeItem(cacheKey);
      return true;
    } catch (error) {
      return false;
    }
  }
  clearUserCache(userId) {
    try {
      const keys = Object.keys(sessionStorage);
      const userPrefix = `${this.prefix}${userId}_`;
      keys.forEach(key => {
        if (key.startsWith(userPrefix)) {
          sessionStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  clearExpired() {
    try {
      const keys = Object.keys(sessionStorage);
      let cleared = 0;
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          try {
            const cached = sessionStorage.getItem(key);
            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expiresAt) {
              sessionStorage.removeItem(key);
              cleared++;
            }
          } catch (e) {
            sessionStorage.removeItem(key);
            cleared++;
          }
        }
      });
      return cleared;
    } catch (error) {
      return 0;
    }
  }
  clearAll() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  has(key, userId) {
    return this.get(key, userId) !== null;
  }
  getInfo() {
    try {
      const keys = Object.keys(sessionStorage);
      const cacheKeys = keys.filter(k => k.startsWith(this.prefix));
      const info = {
        total: cacheKeys.length,
        expired: 0,
        valid: 0,
        size: 0
      };
      cacheKeys.forEach(key => {
        try {
          const cached = sessionStorage.getItem(key);
          info.size += cached.length;
          const cacheData = JSON.parse(cached);
          if (Date.now() > cacheData.expiresAt) {
            info.expired++;
          } else {
            info.valid++;
          }
        } catch (e) {
          info.expired++;
        }
      });
      return info;
    } catch (error) {
      return null;
    }
  }
}
export default new CacheService();
