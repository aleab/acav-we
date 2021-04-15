export default class EventHandler<T> implements IEventHandler<T> {
    private readonly subs: Set<(e: T) => void> = new Set();
    subscribe(callback: (e: T) => void) { this.subs.add(callback); }
    unsubscribe(callback: (e: T) => void) { this.subs.delete(callback); }
    invoke(e: T) { this.subs.forEach(callback => callback(e)); }
}
