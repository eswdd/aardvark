---
layout: default
title: Aardvark - Installation
---
Installing Aardvark
===================

You have 2 options for installing / running Aardvark:
* Node.js module
* Static hosting

Node.js
-------

Node.js installation is very simple:

    npm install aardvark


To run:

    cd node_modules/aardvark
    node aardvark.js -c <config_file>



Static hosting
--------------

Each release of Aardvark on Github is accompanied by a versioned .tar.gz file containing the static files required for hosting on a webserver.

Installation steps:

* Unpack release in document root
* Create folder to contain config
* Create config


    gzip -dc aardvark-<version>.tar.gz | tar xv
    mkdir aardvark
    vi aardvark/config