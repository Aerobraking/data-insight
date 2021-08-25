import * as _ from "underscore";

export abstract class View {
    order: number = 0;
    id: number = 0;
    isActive: boolean = false;
    name: string = "";
    type: string = "";
}