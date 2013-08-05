#!/bin/sh -xe

NODE_PATH=src ./node_modules/.bin/jasmine-node --test-dir jasmine-specs/ --captureExceptions
