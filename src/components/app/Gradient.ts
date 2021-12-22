export default class Gradient {
    constructor(f: Function, id: string, reverse: boolean = false) {
        this.f = f;
        this.id = id;
        this.reverse = reverse;
    }
    f: Function;
    id: string;
    reverse: boolean = false;

    public getColor(value: number): string {
        return this.f(this.reverse ? 1 - value : value)
    }
}