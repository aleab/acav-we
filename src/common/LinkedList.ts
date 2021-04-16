/* eslint-disable max-classes-per-file */

class ListNode<T> {
    value: T;
    prev: ListNode<T> | undefined;
    next: ListNode<T> | undefined;

    constructor(value: T, prev?: ListNode<T>, next?: ListNode<T>) {
        this.value = value;
        this.prev = prev;
        this.next = next;
    }
}

export default class LinkedList<T> {
    private _length: number = 0;
    get length() { return this._length; }

    private head: ListNode<T> | undefined;
    private tail: ListNode<T> | undefined;

    get first() { return this.head?.value; }
    get last() { return this.tail?.value; }

    append(value: T): void {
        this._length++;
        const node = new ListNode<T>(value, this.tail);

        if (this.tail === undefined) {
            this.head = node;
        } else {
            this.tail.next = node;
        }
        this.tail = node;
    }

    insertAt(i: number, value: T): void {
        if (this._length === 0) {
            this.append(value);
        } else {
            const index = Math.clamp(i, 0, this._length);
            if (index === 0) {
                this._length++;
                const node = new ListNode<T>(value, undefined, this.head);
                this.head!.prev = node;
                this.head = node;
            } else if (index === this._length) {
                this.append(value);
            } else {
                const node = this.at(index)!;
                const newNode = new ListNode<T>(value, node.prev, node);
                node.prev!.next = newNode;
                node.prev = newNode;
                this._length++;
            }
        }
    }

    removeAt(i: number): T | undefined {
        if (i < 0 || i >= this._length) return undefined;
        if (i === 0) return this.shift();

        if (i === this._length - 1) {
            this._length--;
            const t = this.tail!;
            this.tail = t.prev!;
            this.tail.next = undefined;
            t.prev = undefined;
            return t.value;
        }

        const node = this.at(i);
        if (node !== undefined) {
            this._length--;
            const prev = node.prev;
            const next = node.next;

            node.prev = undefined;
            node.next = undefined;

            if (prev !== undefined) prev.next = next;
            if (next !== undefined) next.prev = prev;

            return node.value;
        }

        return undefined;
    }

    shift(): T | undefined {
        if (this.head === undefined) return undefined;

        this._length--;
        const value = this.head.value;

        const h = this.head;
        this.head = h.next;
        h.next = undefined;

        if (this.head !== undefined) {
            this.head.prev = undefined;
        } else {
            this.tail = undefined;
        }

        return value;
    }

    getAt(i: number): T | undefined {
        return this.at(i)?.value;
    }

    findCouple(fn: (prev: T, next: T) => boolean, fromTail: boolean = false): { prev: T | undefined, next: T | undefined, i: number } {
        const x = this.findCoupleInternal(fn, fromTail);
        return {
            prev: x.prev?.value,
            next: x.next?.value,
            i: x.i,
        };
    }

    insertSorted(value: T, compareFn: (a: T, b: T) => number): number {
        if (this._length === 0) {
            this.append(value);
            return 0;
        }

        let i = -1;
        const dh = compareFn(value, this.head!.value);
        const dt = compareFn(value, this.tail!.value);

        if (dh <= 0) i = 0;
        if (dt >= this._length) i = this._length;

        if (i === -1) {
            const { prev, next, i: _i } = this.findCoupleInternal(
                (a, b) => compareFn(value, a) >= 0 && compareFn(value, b) < 0,
                Math.abs(dh) >= Math.abs(dt),
            );
            i = _i;

            // ???
            if (prev === undefined && next === undefined) i = 0;
            if (prev === undefined) i = 0;
            if (next === undefined) i = this._length;
        }

        if (i >= 0 && i <= this._length) {
            this.insertAt(i, value);
            return i;
        }
        return -1;
    }

    private at(i: number): ListNode<T> | undefined {
        if (i < 0 || i >= this._length) return undefined;

        let n: ListNode<T> | undefined;
        if (i <= this._length - i) {
            // from head
            let j = 0;
            n = this.head;

            while (j < i && n !== undefined) {
                j++;
                n = n?.next;
            }
        } else {
            // from tail
            let j = this._length - 1;
            n = this.tail;

            while (j > i && n !== undefined) {
                j--;
                n = n?.prev;
            }
        }

        return n;
    }

    private findCoupleInternal(fn: (prev: T, next: T) => boolean, fromTail: boolean = false): {
        prev: ListNode<T> | undefined,
        next: ListNode<T> | undefined,
        i: number,
    } {
        let prev: ListNode<T> | undefined;
        let next: ListNode<T> | undefined;
        let i = -1;

        if (!fromTail) {
            // from head
            i = 1;
            let n = this.head!;
            while (n.next !== undefined) {
                if (fn(n.value, n.next.value)) break;
                n = n.next;
                i++;
            }
            prev = n;
            next = n.next;
        } else {
            // from tail
            i = this._length - 1;
            let n = this.tail!;
            while (n.prev !== undefined) {
                if (fn(n.prev.value, n.value)) break;
                n  = n.prev;
                i--;
            }
            prev = n.prev;
            next = n;
        }

        return { prev, next, i };
    }
}
