/*global _,$,window*/
var APP = (function (w, d, $, _) {

    var SOL_URL = "sol.php?url=" + encodeURI("http://10.2.21.132:8181/WebDisplay.xml?NoCache="),    // source data url
        //SOL_URL = "xml.xml?noCache=",                                                             // test source url
        interval = 5000,                                                                            // default polling to 1 second
        firstRun = true,                                                                            // true until after first ajax rrequest
        group = "Main Clearing",                                                                    // default to Main Clearing Group
        $window = $(w),                                                                             // jQuery window object
        $clearingTitle = $("#clearing-title"),                                                      // title of group
        $menu = $("#menu"),                                                                         // menu
        $menuToggler = $("#menu-toggler"),                                                          // menu toggler
        el = "app",
        $el = $("#app"),                                                                            // container for template
        failed = 0,                                                                                 // keep track of how many ajax requests failed

        /* jshint -W015 */
        template = [
            "<dl class=\"call-stat primary clearfix\">",
                "<dt class=\"call-queue\">Calls in queue:</dt>",
                "<dd class=\"call-queue-stat <%= inQueueClass %>\"><%= inQueue %></dd>",
            "</dl>",
            "<dl class=\"call-stat secondary clearfix\">",
                "<dt class=\"call-agents-logged-on\">Agents logged on:</dt>",
                "<dd class=\"call-agents-logged-on-stat <%=agentsLoggedOnClass %>\"><%= agentsLoggedOn %></dd>",
                "<dt class=\"call-agents-available \">Agents availabile:</dt>",
                "<dd class=\"call-agents-available-stat <%= agentsClass %>\"><%= agentsAvailable %></dd>",
                "<dt class=\"call-calls-answered\">Calls answered:</dt>",
                "<dd class=\"call-calls-answered-stat null\"><%= answered %></dd>",
                "<dt class=\"call-percentage-missedTotal\">% Calls missed:</dt>",
                "<dd class=\"call-percentage-missedTotal-stat <%=missedTotalClass %>\"><%= missedCalculated %>%</dd>",
                "<dt class=\"call-agents-wait-time\">Average wait time:</dt>",
                "<dd class=\"all-agents-wait-time-stat null\"><%= waitTimeFormated %></dd>",
            "</dl>",
        ].join("\n"),
        /* jshint +W015 */

        groups = [
            {
                friendlyName : "Main Clearing",
                groupName : "Main Clearing",
                hash : "agents"
            },
            {
                friendlyName : "Clearing SEMS Civil",
                groupName : "SEMS Civil",
                hash : "civil"
            },
            {
                friendlyName : "Clearing SEMS Elec",
                groupName : "SEMS Elec",
                hash : "elec"
            },
            {
                friendlyName : "Clearing SEMS MAE",
                groupName : "SEMS MAE",
                hash : "mae"
            },
            {
                friendlyName : "Clearing SEMS Maths",
                groupName : "SEMS Maths",
                hash : "maths"
            },
            {
                friendlyName : "Clearing Informatics",
                groupName : "Informatics",
                hash : "informatics"
            },
            {
                friendlyName : "Clearing Journalism",
                groupName : "Journalism",
                hash : "journalism"
            },
            {
                friendlyName : "Clearing Music",
                groupName : "Music",
                hash : "music"
            },
            {
                friendlyName : "Clearing Economics",
                groupName : "Economics",
                hash : "economics"
            },
            {
                friendlyName : "Clearing Politics",
                groupName : "Politics",
                hash : "politics"
            },
            {
                friendlyName : "Clearing Psychology",
                groupName : "Psychology",
                hash : "psychology"
            },
            {
                friendlyName : "Clearing Sociology",
                groupName : "Sociology",
                hash : "sociolgy"
            },
            {
                friendlyName : "Clearing INTO",
                groupName : "INTO",
                hash : "into"
            },
            {
                friendlyName : "Clearing C and I",
                groupName : "C and I",
                hash : "city"
            },
            {
                friendlyName : "Clearing Cass",
                groupName : "CASS",
                hash : "cass"
            },
            {
                friendlyName : "Clearing LAW",
                groupName : "LAW",
                hash : "law"
            },
            {
                friendlyName : "Clearing SHS",
                groupName : "SHS",
                hash : "shs"
            },
            {
                friendlyName : "Clearing Radiography",
                groupName : "Radiography",
                hash : "radiography"
            },
            {
                friendlyName : "Clearing Optometry",
                groupName : "Optometry",
                hash : "optometry"
            },
            {
                friendlyName : "Clearing SHS SLT",
                groupName : "SLT",
                hash : "slt"
            },
            {
                friendlyName : "Clearing Creative Industries",
                groupName : "Creative Ind",
                hash : "creative"
            }
        ],

        // METHODS

        /*
         * Sets current group
         * @param {Object} group - object for group containing hash, groupName, friendlyName
         * @return {Undefined}
         *
        */
        setGroup = function (group) {
            APP.group = group.groupName;
            $clearingTitle.text(group.friendlyName);
        },

        /*
         * Renders results
         * @param {Object} dataObj - containing data to be renderered
         * @return {Undefined}
         *
        */
        render = function (dataObj) {
            $el.empty();
            $el.append(_.template(template, dataObj));
        }
    ; // end vars

    // Uitlity fns

    /*
     * Converts hh:mm:ss to seconnds only
     * @param {String} str - string to be converted
     *
    */
    function hmsToSecondsOnly(str) {
        var p = str.split(":"),
            s = 0,
            m = 1;

        while (p.length > 0) {
            s += m * parseInt(p.pop(), 10);
            m *= 60;
        }

        return s;
    }

    /*
     * Converts seconds to hh:mm:ss format
     * @param {String} d - seconds as a string
     * @return {String} HH:MM:SS format
     * src - http://stackoverflow.com/questions/5539028/converting-seconds-into-hhmmss
    */
    function secondsToHms(d) {

        var h,
            m,
            s;

        d = Number(d);
        h = Math.floor(d / 3600);
        m = Math.floor(d % 3600 / 60);
        s = Math.floor(d % 3600 % 60);
        return ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
    }

    function errorHandler() {
        // only recurse while there's less than 10 failed requests.
        // otherwise the server might be down or is experiencing issues.
        if ( ++failed < 10 ) {

            // give the server some breathing room by
            // increasing the interval
            interval = interval + 1000;
            loopsiloop(interval);
        }
    }


    // event handler for menu clicks
    $menu.on("click", "a", function(e) {
        var $this = $(e.target);

        if ($this.is("span")) {
            $this = $this.parent("a");
        }

    });

    //menu toggler
    $menuToggler.on("click", function(e) {
        e.preventDefault();
        $menu.toggleClass("active");
    });

    // Bind an event to window.onhashchange that, when the history state changes,
    // iterates over all tab widgets, changing the current tab as necessary.
    $window.on("hashchange", function (e) {
        var newHash = window.location.hash.substring(1);

        if (newHash === "") {
            APP.setGroup(groups[0]);
        }

        $.each(groups, function (i, e) {
            if (e.hash === newHash) {
                APP.setGroup(e);
            }
        });

    });

    /*
     * A recursive Timeout fn to poll xml source
     * src = http://www.erichynds.com/blog/a-recursive-settimeout-pattern
     * @param (Number) interval - how long between each poll, in milliseconds
    */
    (function loopsiloop(interval) {

        if (firstRun) {
            interval = 0;
            firstRun = false;
        } else {
            interval = interval || 5000;
        }

        setTimeout(function() {

            $.ajax({
                type     : "get",
                async    : false,
                dataType : "xml",
                url      : SOL_URL + new Date().getTime(), // cache bust
                success  : function (data) {

                    // object to contain data from xml - will be feed to above template for display
                    var dataObj = {
                        answered : 0,                           // number of calls answered
                        missedTotal : 0,                        // number of calls missedTotal
                        missedTotalClass : "good",              // color class, default to good
                        missedCalculated : 0,                   // calculated percentage of calls missed
                        callsTotal : 0,                         // answered + missed
                        agentsAvailable : 0,                    // number of agents available to take call in group
                        agentsClass : "good",                   // color class, default to good
                        agentsLoggedOn : 0,                     // number of agents logged on in group
                        agentsLoggedOnClass : "good",           // color class, default to good
                        inQueue : 0,                            // number of calls in group call
                        inQueueClass : "good",                  // color class, default to good
                        averageWait : [0.0, 0.0],               // average wait time till call answered
                        totalObjects : 0,                       // number of rows
                        waitTimeTotal : 0,                      // total wait time for all groups in seconds
                        waitTimeCalculated : 0,                 // calculated wait time in seconds
                        waitTimeFormated : "",                  // calculated wait time formatted for display
                        title : group                           // title of group
                    },
                    $row = $(data).find("row[name='" + APP.group + "']");

                    // what you consider valid is totally up to you
                    // what are the failure possibilities here?
/*                    if (data === "failure" ){
                       errorHandler();
                    }*/

                    dataObj.answered = parseInt($row.find("seg:eq(2)").text(), 10);
                    dataObj.missedTotal = parseInt($row.find("seg:eq(4)").text(), 10);
                    dataObj.agentsAvailable = parseInt($row.find("seg:eq(6)").text(), 10);
                    dataObj.agentsLoggedOn = parseInt($row.find("seg:eq(12)").text(), 10);
                    dataObj.inQueue = parseInt($row.find("seg:eq(8)").text(), 10);
                    dataObj.waitTimeFormated = $row.find("seg:eq(10)").text();

                    // calculate total calls
                    dataObj.callsTotal = dataObj.missedTotal + dataObj.answered;

                    // work out percentage of missed calls
                    if (dataObj.callsTotal === 0) {
                        dataObj.missedCalculated = 0;
                    } else {
                        dataObj.missedCalculated = Math.round((dataObj.missedTotal / dataObj.callsTotal) * 100);
                    }

                    // we need to work out what class each dataObj value requires

                    // figure missedTotal calls class
                    if (dataObj.missedTotal > 10) {
                        // more than 10 missedTotal calls is bad
                        dataObj.missedTotalClass = "bad";
                    } else if (dataObj.missedTotal > 4) {
                        // more than 4 is middling
                        dataObj.missedTotalClass = "okay";
                    }

                    // figure out agents logged on class
                    if (dataObj.agentsLoggedOn <= 0) {
                        dataObj.agentsLoggedOnClass = "bad";
                    }

                    // figure out agents available class
                    if (dataObj.agentsAvailable <= 0) {
                        dataObj.agentsClass = "bad";
                    }

                    // figure out calls in queue class
                    if (dataObj.inQueue >= 2) {
                        dataObj.inQueueClass = "bad";
                    } else if (dataObj.inQueue >= 1) {
                        dataObj.inQueueClass = "okay";
                    }

                    // render the template
                    APP.render(dataObj);

                    loopsiloop(); // recurse

                }, // end success
                error : errorHandler
            }); // end $.ajax
        }, interval); // end setTimeout
    }()); // end loopsiloop

    return {
        group: group,
        setGroup : setGroup,
        render: render
    };

}(window, document, jQuery, _, null));

$(window).trigger("hashchange");
