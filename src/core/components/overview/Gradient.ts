/**
 * Defines a Geradient that is used by the AbstractFeatureGradient class.
 * Offers some parameters to reverse or custom scale the output of the gradient
 * when asking for a color with a given numerical value.
 */
export default class Gradient {

    /**
     * @param f The function that returns the color string for the given numerical value.
     * @param id A unique id for the gradient
     * @param reverse true: reverses the value: so value = max - value 
     * @param scale you can modify the value with the function before it is used to get the color string.
     * @param range The range is normally 0...1 but you can custom define it here to only use the range from 0.4...1 for example.
     */
    constructor(f: (value: number) => string, id: string, reverse: boolean = false, scale: ((n: number) => number) | undefined = undefined, range: number[] = [0, 1]) {
        this.f = f;
        this.id = id;
        this.reverse = reverse;
        this.scale = scale;
        this.range = range;

    }
    
    private f: (value: number) => string;
    id: string;
    reverse: boolean = false;
    scale: ((n: number) => number) | undefined;
    range: number[];

    public getColor(value: number): string {
        if (this.scale) value = this.scale(value);
        return this.f(this.reverse ? this.range[1] - value : value)
    }
}