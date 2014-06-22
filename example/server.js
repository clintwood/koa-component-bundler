/*
 * Dependancies
 */

// core modules
var path = require('path');
var koa = require('koa');
var serve = require('koa-static');
var bundler = require('..');

// create koa app
var app = koa();
app.name = 'Koa Example app.';

var bootDir = path.join(__dirname, 'boot');
var buildDir = path.join(__dirname, 'build');
var productionMode = (app.env == 'production');

// fix node warnings about listener memory leaks ???
process.setMaxListeners(15);

// middlewares

// global error handling
app.use(function* errors(next) {
  try {
    yield* next;
  } catch (err) {
    this.status = err.status || 500;
    this.body = err.message;
    this.app.emit('error', err, this);
  }
});

app.use(bundler({
  boot: bootDir,
  build: buildDir,
  force: !productionMode,
  uglifyjs: productionMode,
  cleancss: productionMode
}))

app.use(serve(buildDir, {
  defer: true
}));

app.use(serve(__dirname, {
  defer: true
}));

var port = process.env.PORT || 3000;
app.listen(port, function(err) {
  if (err) throw err;
  console.log('%s listening on port %s.', (app.name || 'WebSite'), port);
});
