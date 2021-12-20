import { AbstractNode } from "../OverviewData";

export default class FolderNode extends AbstractNode {
    constructor(name: string) {
        super("folder", name);
    }
}