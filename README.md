aardvark
========

An [OpenTSDB](http://opentsdb.net) Visualiser.

A brief list of intended features:
* Javascript client-side rendered graphs
* Auto-downsampling of series to prevent browser 'lock-up'
* Auto scaling
* Stacked graphs
* Baselining - compare a time series to an earlier version of itself
* Filter UI by tag key/value and or time range
* Deep linking
* Popout to Gnuplot image
* Tree based metric selection
* View/add/edit annotations
* Metadata viewer

Getting started
---------------

* Install node
* Run some commands:
```
   $ git clone https://github.com/eswdd/aardvark.git
   $ cd aardvark
   $ npm install
   $ npm start
```
* Point browser at [http://localhost:8000/](http://localhost:8000/).

Why the name?
-------------

It was originally called Aardvark (from <u>O</u>pen<u>T</u>SDB V<u>is</u>ualiser). Anyone growing up in the UK in the 90's
should be well aware of [https://en.wikipedia.org/wiki/Aardvark_the_Aardvark](Aardvark the Aardvark).

Project info
------------

[![Build Status](https://travis-ci.org/eswdd/aardvark.svg?branch=master)](https://travis-ci.org/eswdd/aardvark)

Copyright
---------
```
   Copyright 2014 Simon Matic Langford

   Licensed under the GNU General Public License, Version 3.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.gnu.org/licenses/gpl-3.0.txt

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```
