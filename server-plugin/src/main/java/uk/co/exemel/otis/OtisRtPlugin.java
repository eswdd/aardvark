package uk.co.exemel.otis;

import com.stumbleupon.async.Deferred;
import net.opentsdb.core.*;
import net.opentsdb.meta.Annotation;
import net.opentsdb.stats.StatsCollector;
import net.opentsdb.tsd.RTPublisher;
import net.opentsdb.uid.UniqueId;
import org.hbase.async.HBaseClient;

import java.util.Map;

/**
 *
 */
public class OtisRtPlugin extends RTPublisher {
    private TSDB tsdb;

    @Override
    public void initialize(TSDB tsdb) {
        this.tsdb = tsdb;
        //To change body of implemented methods use File | Settings | File Templates.
    }

    @Override
    public Deferred<Object> shutdown() {
        return new Deferred<Object>();
    }

    @Override
    public String version() {
        return "2.0.0";
    }

    @Override
    public void collectStats(StatsCollector statsCollector) {

    }

    @Override
    public Deferred<Object> publishDataPoint(String metric, long timestamp, long value, Map<String, String> tags, byte[] tsuid) {
        handleDataPoint(metric,timestamp,tags);
        return new Deferred<>();
    }

    @Override
    public Deferred<Object> publishDataPoint(String metric, long timestamp, double value, Map<String, String> tags, byte[] tsuid) {
        handleDataPoint(metric,timestamp,tags);
        return new Deferred<>();
    }

    private void handleDataPoint(String metric, long timestamp, Map<String, String> tags) {
        final long base_time;

        if ((timestamp & Const.SECOND_MASK) != 0) {
            // drop the ms timestamp to seconds to calculate the base timestamp
            base_time = ((timestamp / 1000) -
                    ((timestamp / 1000) % Const.MAX_TIMESPAN));
        } else {
            base_time = (timestamp - (timestamp % Const.MAX_TIMESPAN));
        }


        byte[] metricUid = tsdb.getUID(UniqueId.UniqueIdType.METRIC, metric);
        for (Map.Entry<String,String> e : tags.entrySet()) {
            byte[] tagkUid = tsdb.getUID(UniqueId.UniqueIdType.TAGK, e.getKey());
            byte[] tagvUid = tsdb.getUID(UniqueId.UniqueIdType.TAGV, e.getValue());
        }




    }


    @Override
    public Deferred<Object> publishAnnotation(Annotation annotation) {
        return new Deferred<>();
    }
}
