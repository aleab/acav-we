export default class Stack<T> {
    private readonly array: T[];

    get size(): number { return this.array.length; }

    constructor() {
        this.array = [];
    }

    isEmpty(): boolean { return this.array.length === 0; }
    push(item: T) { this.array.push(item); }
    pop(): T | undefined { return this.array.pop(); }
    peek(): T | undefined { return this.array.length === 0 ? undefined : this.array[this.array.length - 1]; }
}
