#!/bin/bash

USER=$GITHUB_USER
PASS=$GITHUB_PASSWORD
EMAIL=$GIT_EMAIL
NAME=$GIT_NAME

if [ -z $USER ]; then
  if [ ! -z "$1" ]; then
    USER=$1
  fi
fi
if [ -z $PASS ]; then
  if [ ! -z "$2" ]; then
    PASS=$2
  fi
fi

if [ -z "$USER" ]; then
  echo "Usage: publish.sh [<gh-user> [gh-password]]" >&2
  echo "" >&2
  echo "       Username/password may also be passed by setting environment variables:" >&2
  echo "         GITHUB_USER" >&2
  echo "         GITHUB_PASSWORD" >&2
  echo "       If no password set then will try to use private key" >&2
  echo "" >&2
  echo "       Git name/email - if not set locally then need to be provided via environment variables:" >&2
  echo "         GIT_EMAIL" >&2
  echo "         GIT_NAME" >&2
  exit 1
fi

USER_PASS=$USER
if [ ! -z $PASS ]; then
  USER_PASS=$USER_PASS:$PASS
fi


bundle exec jekyll build --trace --config _config.yml
cd _site
mkdir user_guide
cp user-guide.html user_guide
cp -R css user_guide
for i in `cat user-guide.html  | grep img | grep -v http | grep -o "src=\".*\"" | sed -e 's/alt=.*//' -e 's/src=//' -e 's/\"//g'`; do
  cp $i user_guide
done

git clone -b master https://$USER_PASS@github.com/aardvark.git master
cp -R user_guide master/static-content
for i in `ls user_guide | sed -e 's/user_guide\///'`; do
  git add gh-pages/static-content/$i
done
#todo: removal of old content
cd master 
git commit -m "Auto commit of latest user guide from gh-pages branch build"


