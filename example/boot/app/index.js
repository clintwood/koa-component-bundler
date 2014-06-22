/**
 * Module dependencies.
 */

var dom = require('dom');
var content = require('./page.html');

function run() {
  dom('#content').html(content);
}

// export
module.exports.run = run;