# mist-wrapper

A class of convenience functions for easy access [ControlThing's](https://www.controlthings.fi) Mist/Wish IoT libraries. 

The *source code* in this project is released under Apache 2.0. To actually implement cool solutions you need to license ControlThing's libraries. Head over to [their web](https://www.controlthings.fi/) to learn more about that!

## Prerequisites

When running Linux x64 or macOS x64 everything should work swimmingly if you follow the instructions below. Windows isn't supported (yet).

Install:

1. [Node.js v6](https://nodejs.org/dist/latest-v6.x/). Note that v6.x is _required_. You can use [nvm](https://github.com/creationix/nvm) to run multiple Node versions on the same computer.  

2. *Wish*, the p2p communication layer Mist is using. Download the [Wish binaries](https://www.controlthings.fi/dev/) for Linux/macOS, or build it from [the Wish source code](https://github.com/ControlThings/wish-c99). Copy the `wish-core` binary into the examples root folder.

# Installation


```
$ npm install mist-wrapper --save
```

# Usage

## Start Your Engines (the Core)

Assuming you have the Wish binary installed in the root folder and named ```wish-core```:

```sh
$ chmod a+x wish-core
$ ./wish-core -a 9094 -p 37300
```

## Hello World

```
var MistWrapper = require("mist-wrapper");

const init = {
  name: "MyEntity",
  coreIp: "127.0.0.1",
  corePort: 9094
};

var api = new MistWrapper(init.name, init.coreIp, init.corePort);

function main() {
  console.log("Connection to Mist/Wish core successful! Hello World!");
}

api
  .open()
  .then(() => {
    api
      .onReady()
      .then(() => {
        main(api);
      })
      .catch(err => {
        console.error(err);
      });
  })
  .catch(err => {
    console.error(err);
  });

```


