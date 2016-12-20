---
layout: default
title: Aardvark - Configuration Reference 
---

Configuration json structure with defaults:

       {
         tsdbProtocol: "http",
         tsdbHost: “”,
         tsdbPort: 4242,
         tsdbWriteHost: config.tsdbHost,
         tsdbWritePort: config.tsdbPort,
         authenticatedReads: false,
         authenticatedWrites: false,
         annotations: {
           allowAddEdit: true,
           allowDelete: true
         },
         allowBulkAnnotationsCall: true,
         defaultGraphType: “”,
         ui: {
           metrics: {
             enableExpandAll: false,
             alwaysShowMetricFilter: false
           },
           graphs: {
             dygraph: {
               highlightingDefault: false
             }
           }
         },
         hidePrefixes: []
       }

