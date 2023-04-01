# What ?

Service bootstraper / config generator for BackKit

# Why ?

BackKit being a microframework, it is configurable and permissive by nature.

- But do you want to write basic configuration for each module you add to your application ?
- No you don't !

You obviously want each module to work out of the box with at least a basic configuration.

This module is used by backkit compatible modules as dev dependency to help you generate default configuration or/and customise it with interactive prompts

In early version, this prompts used to be implemented by modules them selves, but it became hard to maintain, read and created a lot of duplicated code across backkit modules, so i created this dependency to make things more maintanable, clean and avoir to repeat myself


# Usage example

```js
const nanoid = require('nanoid');
const autoconf = require("@backkit/autoconf");

autoconf('koa')
.generator(self => ([
  {
    putFileOnce: self.serviceConfigMainYML,
    contentYml: self.config
  },
  {
    putFileOnce: self.serviceCodeMainJS,
    content: `module.exports = require('${self.npmModuleName}')`
  },
  {
    putFileOnce: `${self.serviceResourceDir}/.gitkeep`
  }
]))
.default(self => ({
  keys: [nanoid()],
  session: {
    enable: true
  }
}))
.prompt(self => ([
  {
    if: {
      fileNotFound: self.serviceConfigMainYML
    },
    type: 'confirm',
    name: 'session.enable',
    message: "enable session ?",
    default: self.defaultConfig.session.enable,
    validate: function(value) {
      return true;
    }
  }
]))
.run()
```

# Generator commands

**putFileOnce**

Writes a file if it does not exist, recursively creates parent directories if needed

```js
{
	putFileOnce: "your filename",
	contentYml: "your object to serialize in yml"
},
```


```js
{
  putFileOnce: "your filename",
  contentJson: "your object to serialize in json"
},
```


```js
{
  putFileOnce: "your filename",
  content: "raw file content"
},
```

**mkdirp**

Recursively create directory if does not exist

```js
{
  mkdirp: "your directory",
  contentYml: "your object to serialize in yml"
},
```

# Prompt conditions

**if.fileNotFound**

Skips this prompt if condition is met


```js
...
{
  if: {
    fileNotFound: 'your file name'
  },
  ...
  rest of the prompt code
}
...
```

# Prompt syntax

Prompt uses https://www.npmjs.com/package/inquirer v6, check its documentation

# Default

default() parameter function should return a default object to use for configuration of this module 

# Override configuration generation

You can override the way configuration is built.
By default it merges defaultConfig with prompt answers, but you might want to implement some custom logic

**default bahavior example**

```js
autoconf('yourmodule')
...
.answersToConfig((self, answers) => {
  return Object.assign({}, self.defaultConfig, answers);
})
...
run()
```

**add conditional config example**

```js
.answersToConfig((self, answers) => {
  // session will need keys
  if (answers.session.enable === true) {
    answers.keys = [nanoid()]
  }
  return Object.assign({}, self.defaultConfig, answers);
})
```

# Attributes of self

``` js
// id
serviceName
packageJson
npmModuleName

// root dirs
rootServiceDir
rootConfigDir
rootResourceDir

// service code paths
serviceCodeDir
serviceCodeMainJS

// serfice config paths
serviceConfigDir   // optional
serviceConfigMainYML

// resources
serviceResourceDir

// dynamic stuff
answers
defaultConfig

```
