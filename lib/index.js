/**
 * Dependencies
 */

var fs = require('fs');
var cofs = require('co-fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Remotes = require('remotes');
var resolver = require('component-resolver');
var bundler = require('component-bundler');
var builder = require('component-builder');
var UglifyJS = require("uglify-js");
var Autoprefixer = require('autoprefixer');
var CleanCSS = require("clean-css");

var send = require('koa-send');

var plugins = builder.plugins;

module.exports = function (options) {
  if ('string' == typeof options) {
    options = {
      boot: options,
      build: path.join(process.cwd(), 'build')
    };
  }

  // boot is mandatory
  if (!options.boot)
    throw new Error('Options: boot is required.');

  // default build output to cwd()/build
  if (!options.build)
    options.build = path.join(process.cwd(), 'build');

  // check that boot (component) folder has component.json in it...
  var comp = path.join(options.boot, 'component.json');
  if (!fs.existsSync(comp))
    throw new Error('Boot component.json not found at: ' + options.boot);
  // grab boot component json
  var json = JSON.parse(fs.readFileSync(comp));
  // make sure there are locals
  if (!json.locals)
    throw new Error('Boot component.json does not contain a locals: ' + comp);

  // ensure build & bundle dirs exists
  mkdirp.sync(options.build);
  json.locals.forEach(function (bundle) {
    mkdirp.sync(path.join(options.build, bundle));
  });

  // options.extensions specifies the file extensions to consider
  if ('string' !== typeof options.extensions)
    options.extensions = 'js|json|css|woff|eot|svg|ttf';
  var exts = new RegExp('\.(' + options.extensions + ')$');

  // set appropriate defaults for uglifyjs
  if (options.uglifyjs === true) options.uglifyjs = { fromString: true };
  if (options.uglifyjs) {
    if('object' !== typeof options.uglifyjs)
      throw new Error('Options: options.uglifyjs must of type object.');
    // only accept strings
    options.uglifyjs.fromString = true;
  }

  // set appropriate defaults for autoprefixer
  var autoprefix;
  if (options.autoprefix === true) {
    autoprefix = Autoprefixer();
  } else if (options.autoprefix && 'object' !== typeof options.autoprefix) {
    autoprefix = Autoprefix(options.autoprefix.browsers || Autoprefix.default.join(', '), options.autoprefix);
  }

  // set appropriate defaults for cleancss
  var cleancss;
  if (options.cleancss === true) {
    cleancss = new CleanCSS();
  } else if (options.cleancss && 'object' !== typeof options.cleancss) {
    cleancss = new CleanCSS(options.cleancss);
  }

  // koa bundler middelware
  return function* koaBundler(next) {
    // filter on HTTP GET/HEAD & *.<extensions> resource targeting build dir
    if (('GET' !== this.method && 'HEAD' !== this.method) || !exts.test(this.path) || !bundlePath(json.locals, this.path))
      return yield* next;

    var target = path.join(options.build, this.path);

    // unless being forced only bundle if the target doesn't exist
    if (!(yield cofs.exists(target)) || options.force) {

      // process bundles
      var pageBundler = bundler.pages(json);

      var tree = yield* resolver(options.boot, {
        remote: options.remotes,
        install: true
      });

      // create bundles
      var bundles = pageBundler(tree);

      // build each bundle
      var builds = Object.keys(bundles).map(function (name) {
        return function* bundleBuilder() {

          // root folder for bundle
          var bundleRoot = path.join(options.build, name);

          // build scripts
          var file;
          var js = yield builder.scripts(bundles[name])
            .use('scripts', plugins.js({parse: options.parseJs === true}))
            .use('json', plugins.json())
            .use('templates', plugins.string())
            .end();

          // add require implementation to main bundle
          if (name === json.locals[0])
            js = builder.scripts.require + js;
          
          // uglify maybe
          if (js && js.length > 0 && options.uglifyjs) {
            js = UglifyJS.minify(js, options.uglifyjs).code;
          }

          // write or remove target file
          file = path.join(bundleRoot, 'script.js');
          if (!js) {
            if (fs.existsSync(file)) fs.unlinkSync(file)
          } else {
            yield cofs.writeFile(file, js, 'utf8');
          }

          // build styles
          var css = yield builder.styles(bundles[name])
            .use('styles', plugins.urlRewriter(options.prefix || ''))
            .end();

          if (css && css.length > 0) {
            // autoprefix maybe
            if (autoprefix) {
              css = autoprefix.process(css).css;
            }
            // minify maybe
            if (cleancss) {
              css = cleancss.minify(css);
            }
          }

          // write or remove target file
          file = path.join(bundleRoot, 'styles.css');
          if (!css) {
            if (fs.existsSync(file)) fs.unlinkSync(file)
          } else {
            yield cofs.writeFile(file, css, 'utf8');
          }

          // build files
          var files = yield builder.files(bundles[name], { destination: bundleRoot })
            .use('images', plugins.copy())
            .use('fonts', plugins.copy())
            .use('files', plugins.copy())
            .end();
        }
      });

      // actually run the builds
      yield builds;
    }

    // check and return requested file
    var contentType;
    switch (path.extname(this.path)) {
    case '.js': // scripts
      contentType = 'application/javascript';
      break;

    case '.css': // styles
      contentType = 'text/css';
      break;

    default: // files
      break;
    }

    if (yield cofs.exists(target)) {
      if (contentType) {
        this.status = 200;
        this.body = yield cofs.readFile(target, 'utf8');
        this.set('Content-Type', contentType);
      } else {
        yield send(this, target);
      }
    } else {
      yield* next;
    }
  }
}

function bundlePath(names, reqPath) {
  var segs = reqPath.split('/').filter(function(s) { return s.length > 0; });
  if (segs.length <= 1) return false;
  return names.some(function(name) {
    return (name === segs[0]);
  });
}