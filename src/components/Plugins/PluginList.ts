export * from './Rearrange'
export * from './Resize'
export * from './ShowAll'
import AbstractPlugin, { RegisteredPlugins } from "./AbstractPlugin"

export function getPlugins() {
    console.log("liste alle plugins auf");

    console.log(RegisteredPlugins);

    RegisteredPlugins.forEach(p => {
        const panel = new p();
        console.log(p.name, panel.shortcut);

    });

}

