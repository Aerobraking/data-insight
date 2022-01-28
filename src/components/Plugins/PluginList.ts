export * from './Rearrange'
import  { RegisteredPlugins } from "../app/plugins/AbstractPlugin"

export function getPlugins() {
    RegisteredPlugins.forEach(p => {
        const plugin = new p();
        console.log(p.name, plugin.shortcut); 
    });
    return RegisteredPlugins;
}