#!/bin/bash

VERSION=`cat package.json  | grep version | cut -d: -f2 | sed -e 's/[\",\ ]*//g'`
TARGET_DIR=/tmp/aardvark-$VERSION

# output folder
mkdir $TARGET_DIR
# copy content
cp -R static-content/* $TARGET_DIR
# fix some 404s..
cat $TARGET_DIR/index.html  | grep -v nvd3 > 1
mv 1 $TARGET_DIR/index.html
# copy what we need from dependencies
for i in `cat $TARGET_DIR/index.html | grep -o node_modules.* | cut -d\" -f1`; do
  dir=`dirname $i`
  mkdir -p $TARGET_DIR/$dir
  cp $i $TARGET_DIR/$dir
done
cp -R node_modules/bootstrap-css-only/css $TARGET_DIR/node_modules/bootstrap-css-only
cp -R node_modules/bootstrap-css-only/fonts $TARGET_DIR/node_modules/bootstrap-css-only
cp -R node_modules/angular-tree-control/images $TARGET_DIR/node_modules/angular-tree-control
cp -R node_modules/angular-tree-control/fonts $TARGET_DIR/node_modules/angular-tree-control
cp -R node_modules/angular-tree-control/css $TARGET_DIR/node_modules/angular-tree-control

# fix config call so mime types are correct
cat $TARGET_DIR/AardvarkCtrl.js | sed -e 's/aardvark\/config/aardvark\/config.json/' > 1
mv 1 $TARGET_DIR/AardvarkCtrl.js​

WD=`pwd`
pushd /tmp
tar cvf aardvark-$VERSION.tar aardvark-$VERSION
gzip -9 aardvark-$VERSION.tar
mv aardvark-$VERSION.tar.gz $WD
rm -rf $TARGET_DIR
popd