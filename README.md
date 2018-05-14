[![NPM version][npm-version-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![GPL License][license-image]][license-url]
[![Build Status][travis-image]][travis-url]
[![Coverage][coverage-image]][coverage-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]

aardvark
========

An [OpenTSDB](http://opentsdb.net) Visualiser.

A brief list of features:
* Javascript client-side rendered charts:
  * Line charts
  * Ratio charts
  * Mean weighted charts
  * Horizon charts
  * Scatter charts
  * Heatmap charts
* Auto scaling
* Stacked charts
* Filtering by value or top/bottom timeseries
* Deep linking
* Tree based metric selection
* Baselining - compare a time series to an earlier version of itself
* View annotations
* Add/edit annotations

Intended additional features:
* Auto-downsampling of series to prevent browser 'lock-up'
* Filter UI by tag key/value and or time range
* Popout to Gnuplot image
* Metadata viewer

Getting started
---------------

* Install node
* Run some commands:
```
   $ git clone https://github.com/eswdd/aardvark.git
   $ cd aardvark
   $ npm install
   $ node aardvark.js -s -d
```
* Point browser at [http://localhost:8000/](http://localhost:8000/).

Why the name?
-------------

It was originally called Otis (from *O*pen*T*SDB V*is*ualiser). Anyone growing up in the UK in the 90's
should be well aware of [Otis the Aardvark](https://en.wikipedia.org/wiki/Otis_the_Aardvark).

Copyright
---------
```
   Copyright 2014-2017 Simon Matic Langford

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

[license-image]: http://img.shields.io/badge/license-GPL-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/aardvark
[npm-version-image]: http://img.shields.io/npm/v/aardvark.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/aardvark.svg?style=flat

[travis-url]: http://travis-ci.org/eswdd/aardvark
[travis-image]: http://img.shields.io/travis/eswdd/aardvark/master.svg?style=flat

[coverage-url]: https://coveralls.io/r/eswdd/aardvark
[coverage-image]: https://coveralls.io/repos/github/eswdd/aardvark/badge.svg

[snyk-url]: https://snyk.io/test/github/eswdd/aardvark?targetFile=package.json
[snyk-image]: https://snyk.io/test/github/eswdd/aardvark/badge.svg?targetFile=package.json

              
