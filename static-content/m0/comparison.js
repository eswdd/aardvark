
var context = cubism.context()
    .serverDelay(30 * 1000) // allow 30 seconds of collection lag
    .step(5 * 60 * 1000) // five minutes per value
    .size(1920)
    .stop(); // fetch 1920 values (1080p)

var comparison = context.comparison(); // a default comparison chart
var tsdb = context.opentsdb("http://localhost:8000");

//        var primary = tsdb.metric("sum:rate:cpu.percent");
//        var secondary = primary.shift(-7 * 24 * 60 * 60 * 1000);

var cube = context.cube("http://cube.example.com"),
    primary = cube.metric("sum(request)"),
    secondary = primary.shift(-7 * 24 * 60 * 60 * 1000);

var b = d3.select("body");
var c = b.selectAll(".comparison");
var d = c.data([primary, secondary]);
var e = d.enter();
var div = e.append("div");
var clazz = div.attr("class", "comparison");
clazz.call(comparison);

/*
d3.select("body").selectAll(".horizon")
    .data(["AAPL", "BIDU", "SINA", "GOOG"].map(stock))
    .enter().insert("div", ".bottom")
    .attr("class", "horizon")
    .call(context.horizon()
        .format(d3.format("+,.2p")));*/