
export default class Gradient {
    constructor(f: Function, id: string, reverse: boolean = false, scale: ((n: number) => number) | undefined = undefined, range: number[] = [0, 1]) {
        this.f = f;
        this.id = id;
        this.reverse = reverse;
        this.scale = scale;
        this.range = range;

    }
    private f: Function;
    id: string;
    reverse: boolean = false;
    scale: ((n: number) => number) | undefined;
    range: number[];

    public getColor(value: number): string {
        if (this.scale) value = this.scale(value);
        return this.f(this.reverse ? this.range[1] - value : value)
    }
}