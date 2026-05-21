'use client';

/**
 * A lightweight, client-safe event emitter for handling application-wide errors.
 * Replaces the Node.js 'events' dependency to ensure compatibility with Turbopack.
 */
class SimpleEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((fn) => fn(...args));
  }
}

export const errorEmitter = new SimpleEmitter();
