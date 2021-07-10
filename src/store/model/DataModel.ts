import * as _ from "underscore";

export abstract class View {
    id: number = 0;
    isActive: boolean = false;
    name: string = "";
    type: string = "";
}