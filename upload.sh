#!/bin/bash

#aws s3 cp ./bcodmo-data-viewer.bundled.js s3://bcodmo-static/
aws s3 cp ./public/bundle.js s3://bcodmo-static/bcodmo-data-viewer.js
