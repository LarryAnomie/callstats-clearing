/*global _,$,window*/
var APP = (function (w, d, $, _) {

    var SOL_URL = "sol.php?url=" + encodeURI("http://10.2.21.132:8181/WebDisplay.xml?NoCache="),    // source data url
        //SOL_URL = "xml.xml?noCache=",                                                             // test source url
        interval = 0,                                                                               // default polling to 0 to run straight away first time, upped to 5 secs after first run
        firstRun = true,                                                                            // true until after first ajax rrequest
        group = "Main Clearing",                                                                    // default to Main Clearing Group
        $window = $(w),                                                                             // jQuery window object
        $clearingTitle = $("#clearing-title"),                                                      // title of group
        $menu = $("#menu"),                                                                         // menu
        $menuToggler = $("#menu-toggler"),                                                          // menu toggler
        //el = "app",                                                                               // id of container element
        $el = $("#app"),                                                                            // jQuery object of container for template
        failed = 0,                                                                                 // keep track of how many ajax requests failed
        loop = null,                                                                                // placeholder for setTimeout fn

        /* jshint -W015 */
        template = [
            "<dl class=\"call-stat primary clearfix\">",
                "<dt class=\"call-queue\">Calls in queue:</dt>",
                "<dd class=\"circle spin call-queue-stat <%= inQueueClass %>\"><%= inQueue %></dd>",
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
                friendlyName : "Civil",
                groupName : "SEMS Civil",
                hash : "civil"
            },
            {
                friendlyName : "Electrical",
                groupName : "SEMS Elec",
                hash : "elec"
            },
            {
                friendlyName : "Mechanical & Aeronautics",
                groupName : "SEMS MAE",
                hash : "mae"
            },
            {
                friendlyName : "Maths",
                groupName : "SEMS Maths",
                hash : "maths"
            },
            {
                friendlyName : "Informatics",
                groupName : "Informatics",
                hash : "informatics"
            },
            {
                friendlyName : "Journalism",
                groupName : "Journalism",
                hash : "journalism"
            },
            {
                friendlyName : "Music",
                groupName : "Music",
                hash : "music"
            },
            {
                friendlyName : "Economics",
                groupName : "Economics",
                hash : "economics"
            },
            {
                friendlyName : "Politics",
                groupName : "Politics",
                hash : "politics"
            },
            {
                friendlyName : "Psychology",
                groupName : "Psychology",
                hash : "psychology"
            },
            {
                friendlyName : "Sociology",
                groupName : "Sociology",
                hash : "sociolgy"
            },
            {
                friendlyName : "INTO",
                groupName : "INTO",
                hash : "into"
            },
            {
                friendlyName : "CIC - City & Islington College",
                groupName : "C and I",
                hash : "city"
            },
            {
                friendlyName : "Cass",
                groupName : "CASS",
                hash : "cass"
            },
            {
                friendlyName : "Law",
                groupName : "LAW",
                hash : "law"
            },
            {
                friendlyName : "SHS Health Sciences",
                groupName : "SHS",
                hash : "shs"
            },
            {
                friendlyName : "Radiography",
                groupName : "Radiography",
                hash : "radiography"
            },
            {
                friendlyName : "Optometry",
                groupName : "Optometry",
                hash : "optometry"
            },
            {
                friendlyName : "SHS Speech and Language Therapy",
                groupName : "SLT",
                hash : "slt"
            },
            {
                friendlyName : "Creative Industries",
                groupName : "Creative Ind",
                hash : "creative"
            }
        ],

        // METHODS

        /*
         * Does what it says on the tin
         *
        */
        windowReload = function () {
            window.location.reload(true);
        },

        /*
         * Adds events and kicks off APP, called only once from outside APP instance
         * @return {Undefined}
         *
        */
        initApp = function() {

            // event handler for menu clicks
            $menu.on("click", "a", function(e) {
                var $this = $(e.target);

                if ($this.is("span")) {
                    $this = $this.parent("a");
                }

                $menu.find("a").removeClass("active");
                $this.addClass("active");

            });

            // menu toggler
            $menuToggler.bind("click", function(e) {
                e.preventDefault();
                $menu.toggleClass("active");
            });

            // Bind an event to window.onhashchange
            $window.on("hashchange", function () {
                var newHash = window.location.hash.substring(1);

                $menu.find("a").removeClass("active");

                if (newHash === "") {
                    // no hash so set to main group
                    APP.setGroup(groups[0]);

                    $($menu.find("a")[0]).addClass("active");

                } else {
                    $.each(groups, function (i, e) {
                        if (e.hash === newHash) {
                            APP.setGroup(e);
                            $menu.find("#" + e.hash).addClass("active");
                        }
                    });
                }

            });
        },

        /*
         * Kicks off the setTimeout
         * @return {Undefined}
         *
        */
        init = function() {
            APP.loop = setTimeout(
                       $.proxy(APP.getData, APP), // ensures 'this' is the poller obj inside getData, not the window object
                       APP.interval
                    );
        },

        /*
         * Sets current group, called when hashchanges
         * @param {Object} group - object for group containing hash, groupName, friendlyName
         * @return {Undefined}
         *
        */
        setGroup = function (group) {

            $el.addClass("loading");

            // reset interval to 0 so timeout runs straight away on first run with new group
            APP.interval = 0;

            // if we have a timeout running, stop it
            if (APP.loop) {
                clearTimeout(APP.loop);
            }

            // update reference to group
            APP.group = group.groupName;

            // update title with new group
            $clearingTitle.text(group.friendlyName);

            // reset setTimout
            APP.init();
        },

        /*
         * Renders results
         * @param {Object} dataObj - containing data to be renderered
         * @return {Undefined}
         *
        */
        render = function (dataObj) {
            $el.removeClass("loading").empty();
            $el.append(_.template(template, dataObj));
        },

        /*
         * Handles errors on ajax call
         *
         * @return {Undefined}
         *
        */
        errorHandler = function () {
            if (APP.interval === 0) {
                // runs straight away first time, then every 5 seconds after that
                APP.interval = 5000;
            }

            failed = failed + 1;

            // only recurse while there's less than 10 failed requests.
            // otherwise the server might be down or is experiencing issues.
            if (failed < 10 ) {

                // give the server some breathing room by
                // increasing the interval
                APP.interval = APP.interval + 1000;

                // recurse
                APP.init();
            } else {
                // we have run out of try's, maybe reloading page will help
                $el.removeClass("loading").empty().html("<p class=\"error\">Error fetching data. Page will reload in 10 seconds...</p>");
                setTimeout(
                    windowReload,
                10000);
            }
        },

        /*
         * Gets AJAX data and responds to it
         *
         * @return {Undefined}
         *
        */
        getData = function () {

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
                        missedTotalClass : "null",              // color class, default to good
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

                    if (APP.interval === 0) {
                        APP.interval = 5000;
                    }

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

                    if (dataObj.missedTotal > 4) {
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
                    if (dataObj.inQueue >= 1) {
                        dataObj.inQueueClass = "okay";
                    }

                    // render the template
                    APP.render(dataObj);

                    //APP.init(); // recurse on success

                }, // end success
                error : $.proxy(APP.errorHandler, APP)
            }); // end $.ajax
        } // end getData fn
    ; // end vars

    return {
        group: group,
        SOL_URL : SOL_URL,
        setGroup : setGroup,
        render: render,
        interval : interval,
        getData : getData,
        firstRun : firstRun,
        errorHandler : errorHandler,
        loop : loop,
        init : init,
        initApp : initApp
    };

}(window, document, jQuery, _, null));

APP.initApp();
$(window).trigger("hashchange");

