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
           allowDelete: true
         },
         allowBulkAnnotationsCall: true,
         defaultGraphType: “”,
         ui: {
           metrics: {
             enableExpandAll: false,
             alwaysShowMetricFilter: false
           }
         },
         hidePrefixes: []
       }

