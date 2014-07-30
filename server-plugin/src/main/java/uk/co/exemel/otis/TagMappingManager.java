package uk.co.exemel.otis;

import net.opentsdb.core.TSDB;
import net.opentsdb.uid.UniqueId;
import org.hbase.async.KeyValue;
import org.hbase.async.Scanner;

import java.lang.reflect.Field;
import java.util.*;

/**
 */
public class TagMappingManager {

    private static TagMappingManager instance;
    private static final short METRICS_WIDTH;
    private static final short TAG_NAME_WIDTH;
    private static final short TAG_VALUE_WIDTH;

    static {
        try {
            // don't see this info exposed anywhere :(
            Class<TSDB> tsdbClass = TSDB.class;
            Field metricsWidth = tsdbClass.getDeclaredField("METRICS_WIDTH");
            metricsWidth.setAccessible(true);
            METRICS_WIDTH = (Short) metricsWidth.get(null);
            Field tagNameWidth = tsdbClass.getDeclaredField("TAG_NAME_WIDTH");
            tagNameWidth.setAccessible(true);
            TAG_NAME_WIDTH = (Short) tagNameWidth.get(null);
            Field tagValueWidth = tsdbClass.getDeclaredField("TAG_VALUE_WIDTH");
            tagValueWidth.setAccessible(true);
            TAG_VALUE_WIDTH = (Short) tagValueWidth.get(null);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static synchronized TagMappingManager getInstance(TSDB tsdb) {
        if (instance == null) {
            instance = new TagMappingManager(tsdb);
        }
        return instance;
    }

    private TSDB tsdb;

    private TagMappingManager(TSDB tsdb) {
        this.tsdb = tsdb;
    }


    /**
     * Updates the internal mappings of metrics to tags and vice versa.
     */
    public void dataPointReceived(String metric, Map<String,String> tags, long timestamp) {

    }

    /**
     * Gets the complete set of tag names and values that have been used in conjunction with the given metric.
     */
    public Map<String,SortedSet<String>> getValidTagsAndValues(String metric) {
        /*
        This is relatively simply answered by the following schema:
             Table: otis-tag-mappings
             rowkey: <metricuid>
             cf: t
             col: <tagkuid><tagvuid>
             val: irrelevant
         */
        return null;
    }

    /**
     * Gets the complete set of tag names and values that have been used in conjunction with the given metric at some point in the given time range.
     */
    public Map<String,SortedSet<String>> getValidTagsAndValues(String metric, long startTime, long endTime) {
        /*
               startTime              endTime
                   |                    |
  a------------b   |                    |                    : a<=endTime but b<startTime  =>  NO
           c-------|---------d          |                    : c<=endTime and d>=startTime => YES
                   |   e-----------f    |                    : e<=endTime and f>=startTime => YES
                   |            g-------|----h               : g<=endTime and h>=startTime => YES
                   |                    |      i-------j     : i>endTime  and j>=startTime =>  NO
           k-------|--------------------|--------l           : k<=endTime and l>=startTime => YES
                   |                    |

        sql query would  be something like
           SELECT tagk,tagv FROM tbl_mappings t WHERE t.name=metric AND start<=t.endTime AND end>=t.startTime

        hbase:

        is cheap to return all cols in column family for a row
        could have:
          rowkey: <metricuid>
          cf: s (start)
          col: <startTime>
          val: irrelevant

          and similarly:
          rowkey: <metricuid>
          cf: e (end)
          col: <endTime>
          val: irrelevant



        was previously planning to put start/end time inside the table rows for the non-ranged query, but this requires looking at the values

        is it possible to query cols based on col name ordering?

        Could use time ranges / versions.. for the end time then min time range

        what cost to LOTS of hbase versions


create 'otis-tag-mappings',
  {NAME => 't', COMPRESSION => 'NONE', BLOOMFILTER => 'ROW'},
  {NAME => 'm', COMPRESSION => 'NONE', BLOOMFILTER => 'ROW'}

  put 'otis-tag-mappings','metric1','t:t1v1','1',20
  put 'otis-tag-mappings','t1v1','m:metric1','1',20
  put 'otis-tag-mappings','metric1','t:t1v1','1',30
  put 'otis-tag-mappings','t1v1','m:metric1','1',30
  put 'otis-tag-mappings','metric2','t:t1v1','25',10
  put 'otis-tag-mappings','t1v1','m:metric2','25',10
  put 'otis-tag-mappings','metric2','t:t1v2','25',30
  put 'otis-tag-mappings','t1v2','m:metric2','25',30

2.1.0 :027 > scan 'otis-tag-mappings'
ROW                                               COLUMN+CELL
 metric1                                          column=t:t1v1, timestamp=30, value=1
 metric2                                          column=t:t1v1, timestamp=10, value=25
 metric2                                          column=t:t1v2, timestamp=30, value=25
 t1v1                                             column=m:metric1, timestamp=30, value=1
 t1v1                                             column=m:metric2, timestamp=10, value=25
 t1v2                                             column=m:metric2, timestamp=30, value=25

2.1.0 :031 > scan 'otis-tag-mappings', {COLUMNS => 't', TIMERANGE => [22,now()]}
ROW                                               COLUMN+CELL
 metric1                                          column=t:t1v1, timestamp=30, value=1
 metric2                                          column=t:t1v2, timestamp=30, value=25

 --- so if we want to answer 22-32, we would run the above which gives us everything which ends after start
     and then we need to look in the results to confirm that everything starts before the end
     ie. row.value <= 32


     could get expensive, but could consider qualifying row keys with month appended so that we only data subsets - for later..

     sod that, only store day timestamps - ie store end time as beginning of last day on which was written, same for start
       then when query and are checking first dates against end date just make sure we do <= and not <


   2.1.0 :041 > scan 'otis-tag-mappings', {COLUMNS => 'st'}
ROW                                               COLUMN+CELL
 metric1                                          column=t:t1v1, timestamp=30, value=1
 metric2                                          column=t:t1v1, timestamp=30, value=25


SEEMS TO HAVE SOME LEGS..
         */

        /*
        So we have rows of form:
                t1v1         t1v2         t2v1            t2v2
metric1
metric2
metric3
         */

        long startTimeToBeginningOfDay = startTime - startTime%86400000;
        long endTimeToBeginningOfDay = endTime - endTime%86400000;

        Scanner scanner = tsdb.getClient().newScanner("otis-tag-mappings");
        scanner.setMaxVersions(1);
        scanner.setTimeRange(startTimeToBeginningOfDay,Long.MAX_VALUE);
        scanner.setFamily("t");
        scanner.setStartKey(tsdb.getUID(UniqueId.UniqueIdType.METRIC, metric));
        scanner.setStopKey(tsdb.getUID(UniqueId.UniqueIdType.METRIC, metric));

        Map<String,SortedSet<String>> ret = new HashMap<>();

        byte[] tagkBuffer = new byte[TAG_NAME_WIDTH];
        byte[] tagvBuffer = new byte[TAG_VALUE_WIDTH];

        try {
            ArrayList<ArrayList<KeyValue>> values;
            while ((values = scanner.nextRows().join()) != null) {
                // there should only be one of these
                for (ArrayList<KeyValue> row : values) {
                    for (KeyValue cell : row) {
                        long startTimeInCell = toTimestamp(cell.value());
                        if (startTimeInCell <= endTimeToBeginningOfDay) {
                            String[] kv = toTagNameAndValueStrings(cell.qualifier(),tagkBuffer,tagvBuffer);
                            SortedSet<String> valueSet = ret.get(kv[0]);
                            if (valueSet == null) {
                                valueSet = new TreeSet<>();
                                ret.put(kv[0],valueSet);
                            }
                            valueSet.add(kv[1]);
                        }
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return null;
    }

    private long toTimestamp(byte[] value) {
        if (value.length != 8) {
            // eek, let's return -1, the caller can choose what this means
            return -1;
        }
        return (((long)value[0] << 56) +
                ((long)(value[1] & 255) << 48) +
                ((long)(value[2] & 255) << 40) +
                ((long)(value[3] & 255) << 32) +
                ((long)(value[4] & 255) << 24) +
                ((value[5] & 255) << 16) +
                ((value[6] & 255) <<  8) +
                ((value[7] & 255) <<  0));
    }

    private String[] toTagNameAndValueStrings(byte[] combined, byte[] reusableNameBuffer, byte[] reusableValueBuffer) throws Exception {
        System.arraycopy(combined,0,reusableNameBuffer,0,TAG_NAME_WIDTH);
        System.arraycopy(combined,TAG_NAME_WIDTH,reusableValueBuffer,0,TAG_VALUE_WIDTH);

        return new String[] {
                tsdb.getUidName(UniqueId.UniqueIdType.TAGK, reusableNameBuffer).join(),
                tsdb.getUidName(UniqueId.UniqueIdType.TAGV, reusableValueBuffer).join()
        };
    }

    /**
     * Gets the complete set of metrics which have been used in conjunction with the given tag names and values. Values may be null which represents a wildcard.
     */
    public SortedSet<String> getValidMetrics(Map<String,String> tagsAndValues) {

        /*
        This is relatively simply answered by the following schema:
             Table: otis-tag-mappings
             rowkey: <tagkuid><tagvuid>
             cf: m
             col: <metricname>
             val: <starttime><endtime>
        */
        return null;
    }

    /**
     * Gets the complete set of metrics which have been used in conjunction with the given tag names and values at some point in the given time range.. Values may be null which represents a wildcard.
     */
    public SortedSet<String> getValidMetrics(Map<String,String> tagsAndValues, long startTime, long endTime) {
        return null;
    }
}
