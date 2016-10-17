---
layout: default
title: Aardvark - User Guide
---
# Aardvark User Guide

Aardvark is a general purpose visualiser for OpenTSDB. Its aim is to provide a simple yet rich user interface to explore 
time series data, however given the wealth of features available, some guidance is necessary in order to be able to get 
the best out of Aardvark.

## Overview

The Aardvark user interface is split up into 6 main areas:

    ---------------------------------------
    |            Title Area               |
    |-------------------------------------|
    | Global  |               |           |
    |---------|               |  Metric   |
    |         |               | Selection |
    |         |     Graph     |           |
    | Graph   |               |-----------|
    |         |    Display    |           |
    | Control |               |  Metric   |
    |         |               |  Control  |
    |         |               |           |
    ---------------------------------------
    
## Common concepts

### Time periods

Various fields allow the specification of time periods. Aardvark uses the same shorthand format as OpenTSDB consisting of a number followed by a character:

* **s** - seconds
* **m** - minutes
* **h** - hours
* **d** - days
* **w** - weeks
* **y** - years

### Date/time formats

* **Date** - yyyy/mm/dd
* **Time** - HH:MM:SS
    
## Title Area
Aside from providing a thin header, this provides access to reset the entire app to a blank status, and ability to change render modes.

* **Reset** - Removes all metrics and graphs, adds back in a single graph with the default settings.
* **Render** - By default Aardvark only renders graphs when clicking *Save* within either the graph or metric controls or pressing the enter key whilst focus is on a field. However to provide a more dynamic interface you may select *On change* in order to render on change of any input on the screen. This is a user preference and stored in the browser.

## Global Controls
These are controls which affect either the whole page, all graphs, or all metrics.

### Date/time controls
Aardvark allows time to be specified as either relative or absolute.

When time is relative, then all you need provide is a period to look back over from now.
 
When time is absolute, then you must specify a date/time to begin and you may optionally specify a date/time to end (else now is used).

Aardvark also allows you to auto-reload (rerender) the graphs every selected time period.


### Downsampling


### Baselining


## Graph Controls
ipso lorem...


## Graph Display
ipso lorem...


## Metric Selection
ipso lorem...


## Metric Controls
ipso lorem...