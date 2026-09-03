/**
 * Socket Management, Connection Pooling, and Signal Timeouts.
 */

class ConnectionPoolManager {
  /**
   * Tracks and manages persistent keep-alive connections.
   * @param {Object} options
   * @param {number} options.maxSockets - Maximum active sockets per origin
   * @param {number} options.freeSocketTimeoutMs - Timeout before destroying idle socket
   */
  constructor(options = {}) {
    this.maxSockets = options.maxSockets || 64;
    this.freeSocketTimeoutMs = options.freeSocketTimeoutMs || 30000;
    this.activeSockets = new Map();
    this.idleSockets = new Map();
  }

  acquireSocket(origin) {
    let idleList = this.idleSockets.get(origin) || [];
    const now = Date.now();

    while (idleList.length > 0) {
      const item = idleList.pop();
      if (now - item.timestamp <= this.freeSocketTimeoutMs) {
        return item.socket;
      }
      this._destroySocket(item.socket);
    }

    const currentActive = this.activeSockets.get(origin) || 0;
    if (currentActive < this.maxSockets) {
      this.activeSockets.set(origin, currentActive + 1);
      return this._createSocket(origin);
    }

    return null;
  }

  releaseSocket(origin, socket) {
    const currentActive = this.activeSockets.get(origin) || 1;
    this.activeSockets.set(origin, Math.max(0, currentActive - 1));

    let idleList = this.idleSockets.get(origin);
    if (!idleList) {
      idleList = [];
      this.idleSockets.set(origin, idleList);
    }

    idleList.push({ socket, timestamp: Date.now() });
  }

  _createSocket(origin) {
    return {
      id: `sock_${Math.random().toString(36).substr(2, 9)}`,
      origin,
      connectedAt: Date.now()
    };
  }

  _destroySocket(socket) {
    if (socket && typeof socket.destroy === "function") {
      socket.destroy();
    }
  }

  destroyAll() {
    this.idleSockets.forEach((list) => {
      list.forEach((item) => this._destroySocket(item.socket));
    });
    this.idleSockets.clear();
    this.activeSockets.clear();
  }
}

class TimeoutController {
  /**
   * Creates an AbortController with deterministic deadline timeout.
   */
  static create(timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    return {
      signal: controller.signal,
      cancel: () => clearTimeout(timer)
    };
  }
}

module.exports = {
  ConnectionPoolManager,
  TimeoutController
};
