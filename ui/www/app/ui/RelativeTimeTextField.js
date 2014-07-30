Ext.define('Otis.ui.RelativeTimeTextField', {
    extend: 'Ext.form.field.Text',
    alias: 'widget.xrelative',
    value: '2h',
    validator: function (value) {
        var relativeTimeMessage = 'Relative times require a positive integer followed by one of: s,m,h,d,w,y';
        if (value.length < 2) {
            return relativeTimeMessage;
        }
        var lastChar = value.charAt(value.length - 1);
        switch (lastChar) {
            case 's':
            case 'm':
            case 'h':
            case 'd':
            case 'w':
            case 'y':
                break;
            default:
                return relativeTimeMessage;
        }
        var numPart = value.substring(0,value.length-1);
        if (isNaN(numPart) || numPart.indexOf('.')>-1 || parseInt(numPart)<=0) {
            return relativeTimeMessage;
        }
        return true;
    }
});