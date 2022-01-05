# master-data-insight

## Project Development Setup
```
npm install
```

Then, we have to run once (or whenever you install a new npm package) electron-rebuild:

OSX:
```
$(npm bin)/electron-rebuild
```

Windows:
```
.\node_modules\.bin\electron-rebuild.cmd
```

### Compiles and hot-reloads for development
```
npm run electron:serve
```

### Build Installer for current OS
```
npm run electron:build
```

### Controls:

Press F5 in the App or go to the Menu/Help/Controls

### Bei Problemen:

- Eventuell hilft es vue/cli zu installieren, wobei das eigentlich auch per "npm install" gemacht werden sollte:
  npm install -g @vue/cli
