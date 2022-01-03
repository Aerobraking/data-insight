
export default abstract class View {

    // order: number = 0; used in future for sorting of the Tabs in the View
    id: number = 0;
    isActive: boolean = false;
    name: string = "";
    type: string = "";

    constructor() {
        this.id = Math.floor(Math.random() * 1000000000000);
    }

    public setActive(a: boolean): this {
        this.isActive = a;
        return this;
    }
}