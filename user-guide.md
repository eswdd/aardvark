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

Aardvark also allows you to auto-reload (rerender) the graphs every entered time period.

### Downsampling


### Baselining


## Graph Controls

Aardvark supports rendering multiple graphs for the same time period, with the ability to change render engine, chart style and other options independently for each.

### Graph management

Aardvark defaults to a single graph, the renderer for which can be defaulted via (configuration)[config.html].

New graphs can be added by clicking 'Add graph' at the bottom of the graph controls panel.

Individual graphs offer the opportunity to change the title, renderer and also to delete it.

Additions and deletions of graphs are not applied to the render view until 'Save' has been pressed, regardless of render mode. All other changes apply according to the render mode.

### Gnuplot renderer

The gnuplot renderer uses OpenTSDB to render timeseries charts on the server and the controls available mirror those found on the default OpenTSDB user interface.

### Horizon renderer

The horizon renderer uses Cubism from Square.io to render horizon charts, horizon charts are particularly useful for spotting event correlations across a large number of timeseries. 

### Dygraph renderer

The dygraph renderer uses Dygraph to provide client-side rendered time series charts with additional capabilities and flexibility over those provided by gnuplot.

#### Rendering controls

#### y-Axis controls

#### Annotations

#### Filtering controls

#### Specials

### Scatter renderer

The scatter renderer uses Dygraph to plot metrics against each other, this is particularly useful for determining strength or manner of correlation.

The scatter renderer requires exactly 2 time series to be able to render and will show a point for a point in time where a value exists for both plotted series. If you have time series which don't often have points at the same time you may find downsampling will help.

Control over the scatter renderer is currently limited to being able to control whether to exclude negative values from the plot. If a negative is found in either series' value for a point then the point will be excluded. 

### Heatmap renderer

The heatmap renderer uses D3 to render calendar based grids showing the magnitude of a timeseries over time, it is well suited to identifying recurring time-based events.

## Graph Display

This area displays the rendered graphs. For most renderers it is possible to interact with the charts.

### Gnuplot renderer

### Horizon renderer

### Dygraph renderer

### Scatter renderer

### Heatmap renderer

The heatmap renderer doesn't provide any opportunities for interaction with a chart.

It will however show cell values on hover.

## Metric Selection
ipso lorem...


## Metric Controls
ipso lorem...