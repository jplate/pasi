export default class BidirectionalMap<K, V> {
    private keyToValue: Map<K, V> = new Map();
    private valueToKey: Map<V, K> = new Map();

    constructor(array: [K, V][]) {
        array.forEach(([k, v]: [K, V]) => {
            this.set(k, v);
        });
    }

    set(key: K, value: V): void {
        this.keyToValue.set(key, value);
        this.valueToKey.set(value, key);
    }

    getByKey(key: K): V | undefined {
        return this.keyToValue.get(key);
    }

    getByValue(value: V): K | undefined {
        return this.valueToKey.get(value);
    }

    deleteByKey(key: K): boolean {
        const value = this.keyToValue.get(key);
        if (value !== undefined) {
            this.keyToValue.delete(key);
            this.valueToKey.delete(value);
            return true;
        }
        return false;
    }

    deleteByValue(value: V): boolean {
        const key = this.valueToKey.get(value);
        if (key !== undefined) {
            this.valueToKey.delete(value);
            this.keyToValue.delete(key);
            return true;
        }
        return false;
    }
}