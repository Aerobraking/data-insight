import { AbstractNode } from "../../app/overview/AbstractNode";

export default class FolderNode extends AbstractNode {
    constructor(name: string) {
        super("folder", name);
    }
}