import { AbstractNode, OverviewLink } from "./OverviewDataModel";

export class TreeStructure {
    nodes: TreeNode[] = [];
    links: TreeLink[] = [];
}

export class TreeNode extends AbstractNode<TreeNode> {

    setIsDirectory(value: boolean): void {
        this.isDir = value;
    }

    constructor(path: string) {
        super();
        this.path = path;
        this.id = path;
    }


    name?: string;
    path?: string;
    isDir?: boolean;


    getName(): string {
        return this.name ? this.name : "";
    }
    getPath(): string {
        return this.path ? this.path : "";
    }
    isDirectory(): boolean {
        return this.isDir ? this.isDir : false;
    }

}

export class TreeLink extends OverviewLink<TreeNode> {
}