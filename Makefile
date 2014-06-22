BIN=./node_modules/.bin
NODE=node --harmony

test: node_modules
	@$(BIN)/mocha --harmony -t 120s --reporter spec --ui tdd --bail

example: node_modules
	@$(NODE) ./example/server.js

node_modules:
	@npm install

cleanall: clean
	@rm -fr node_modules

clean:
	@rm -fr components build example/build test/build

.PHONY: clean test example