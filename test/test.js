/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var koa = require('koa');
var request = require('supertest');
var should = require('should');

var bundler = require('..');

var bootDir = path.join(__dirname, 'boot');
var buildDir = path.join(__dirname, 'build');
var resultDir = path.join(__dirname, 'results');

// expected css
function appCss() { return fs.readFileSync(path.join(resultDir, 'norm', 'app', 'styles.css'), 'utf8'); }
function appCssMin() { return fs.readFileSync(path.join(resultDir, 'min', 'app', 'styles.css'), 'utf8'); }
function userCss() { return fs.readFileSync(path.join(resultDir, 'norm', 'user', 'styles.css'), 'utf8'); }
function userCssMin() { return fs.readFileSync(path.join(resultDir, 'min', 'user', 'styles.css'), 'utf8'); }
// expected js
function appJs() { return fs.readFileSync(path.join(resultDir, 'norm', 'app', 'script.js'), 'utf8'); }
function appJsMin() { return fs.readFileSync(path.join(resultDir, 'min', 'app', 'script.js'), 'utf8'); }
function adminJs() { return fs.readFileSync(path.join(resultDir, 'norm', 'admin', 'script.js'), 'utf8'); }
function adminJsMin() { return fs.readFileSync(path.join(resultDir, 'min', 'admin', 'script.js'), 'utf8'); }
function userJs() { return fs.readFileSync(path.join(resultDir, 'norm', 'user', 'script.js'), 'utf8'); }
function userJsMin() { return fs.readFileSync(path.join(resultDir, 'min', 'user', 'script.js'), 'utf8'); }

describe('koa-component-bundler', function () {

  describe('with minimum options', function () {
    var app = koa();
    app.use(bundler(bootDir));
    var server = app.listen();

    it('should, install, build & serve - app css', function (done) {
      request(server)
        .get('/app/styles.css')
        .expect(200)
        .expect(appCss(), done);
    });

    it('should, install, build & serve - app js', function (done) {
      request(server)
        .get('/app/script.js')
        .expect(200)
        .expect(appJs(), done);
    });

    it('should, install, build & serve - admin js', function (done) {
      request(server)
        .get('/admin/script.js')
        .expect(200)
        .expect(adminJs(), done);
    });

    it('should, install, build & serve - user css', function (done) {
      request(server)
        .get('/user/styles.css')
        .expect(200)
        .expect(userCss(), done);
    });

    it('should, install, build & serve - user js', function (done) {
      request(server)
        .get('/user/script.js')
        .expect(200)
        .expect(userJs(), done);
    });

  });

  describe('with default minify options', function () {
    var app = koa();
    
    app.use(bundler({
      boot: bootDir,
      build: buildDir,
      uglifyjs: true,
      autoprefix: true,
      cleancss: true
    }));
    var server = app.listen();

    it('should, install, build & serve - app css', function (done) {
      request(server)
        .get('/app/styles.css')
        .expect(200)
        .expect(appCssMin(), done);
    });

    it('should, install, build & serve - app js', function (done) {
      request(server)
        .get('/app/script.js')
        .expect(200)
        .expect(appJsMin(), done);
    });

    it('should, install, build & serve - admin js', function (done) {
      request(server)
        .get('/admin/script.js')
        .expect(200)
        .expect(adminJsMin(), done);
    });

    it('should, install, build & serve - user css', function (done) {
      request(server)
        .get('/user/styles.css')
        .expect(200)
        .expect(userCssMin(), done);
    });

    it('should, install, build & serve - user js', function (done) {
      request(server)
        .get('/user/script.js')
        .expect(200)
        .expect(userJsMin(), done);
    });

  });
});