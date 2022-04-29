# Data Insight

Data Insight is an Open Source, Activity-Centric File Manager.

![The apps interface](http://konnierecker.de/media/datainsight.jpg)

It let's you create Activities, where you can place any number of File Explorer like Windows, Images, YouTube Videos, Node Editors and more.

You can also create visualizations of directories to reveal its structure and properties.


## Get the App

You can find installers of the lates build for both windows and macOS [here](https://github.com/Aerobraking/data-insight/releases/tag/latest).


## Contributing

Feel free to support this project. :) The app lets you easily create new placeable content for an Activity.

A detailed documentation of the projects architecture can be found in the [Wiki](https://github.com/Aerobraking/data-insight/wiki) of this repository.

There are open [Issues](https://github.com/Aerobraking/data-insight/issues) for you to contribute to.


## Project Development Setup

Clone the Repository
```
git clone https://github.com/Aerobraking/data-insight.git
```

Install all used Packages
```
npm i
```

Then, build binaries for native Node.js modules:

OSX:
```
$(npm bin)/electron-rebuild
```

Windows:
```
.\node_modules\.bin\electron-rebuild.cmd
```

Compiles and hot-reloads for development:
```
npm run electron:serve
```

### Build Installer for current OS
```
npm run electron:build
```

