# Introduction

This is a i18next backend to be used node.js. It will load resources from a [Chouchbase](https://www.couchbase.com/) database.

# Getting started

Source can be loaded via [npm](https://www.npmjs.com/package/i18next.couchbase).

```
$ npm install i18next.couchbase
```

Wiring up:

```js
var i18next = require('i18next');
var Backend = require('i18next.couchbase');

i18next
  .use(Backend)
  .init(i18nextOptions);
```

As with all modules you can either pass the constructor function (class) to the i18next.use or a concrete instance.

## Backend Options

```js
{
  cluster: 'http://localhost:8091',
  bucket: 'i18next',
  password: '',
  resCollectionName: 'resources',
  connectionTimeout: 10000,
  operationTimeout: 10000
}
```

Options can be passed in:

**preferred** - by setting options.backend in i18next.init:

```js
var i18next = require('i18next');
var Backend = require('i18next.couchbase');

i18next
  .use(Backend)
  .init({
    backend: options
  });
```

on construction:

```js
var Backend = require('i18next.couchbase');
var backend = new Backend(null, options);
```

by calling init:

```js
var Backend = require('i18next.couchbase');
var backend = new Backend();
backend.init(options);
```
