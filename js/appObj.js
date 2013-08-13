/*global _,$,window*/
var APP = {

        //SOL_URL = "sol.php?url=" + encodeURI("http://10.2.21.132:8181/WebDisplay.xml?NoCache="),  // source data url
        SOL_URL : "xml.xml?noCache=",                                                               // test source url
        interval : 0,                                                                               // default polling to 0 to run straight away first time, upped to 5 secs after first run
        firstRun : true,                                                                            // true until after first ajax rrequest
        group : "Main Clearing",                                                                    // default to Main Clearing Group
        $window : $(window),                                                                             // jQuery window object
        $clearingTitle : $("#clearing-title"),                                                      // title of group
        $menu : $("#menu"),                                                                         // menu
        $menuToggler : $("#menu-toggler"),                                                          // menu toggler
        el : "app",                                                                                 // id of container element
        $el : $("#app"),                                                                            // jQuery object of container for template
        failed : 0,                                                                                 // keep track of how many ajax requests failed
        loop : null,                                                                                       // placeholder for setTimeout fn
        self : this,

        /* jshint -W015 */
        template : [
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

        groups : [
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
         * Does what it says on the tin
         *
        */
        windowReload : function () {
            window.location.reload(true);
        },

        /*
         * Kicks off the setTimeout
         * @return {Undefined}
         *
        */
        init : function() {

            // if this is page load, do some setup

            if (this.firstRun) {

                // event handler for menu clicks
                this.$menu.on("click", "a", function(e) {
                    var $this = $(e.target);

                    if ($this.is("span")) {
                        $this = $this.parent("a");
                    }

                });

                // menu toggler
                this.$menuToggler.on("click", function(e) {
                    e.preventDefault();
                    this.$menu.toggleClass("active");
                });

                // Bind an event to window.onhashchange that, when the history state changes,
                // iterates over all tab widgets, changing the current tab as necessary.
                this.$window.on("hashchange", function () {
                    var newHash = window.location.hash.substring(1);

                    if (newHash === "") {
                        this.setGroup(groups[0]);
                    }

                    $.each(this.groups, function (i, e) {
                        if (e.hash === newHash) {
                            this.setGroup(e);
                        }
                    });

                });

                this.$window.trigger("hashchange");
            }

            this.loop = setTimeout(
               $.proxy(this.getData, this), // ensures 'this' is the poller obj inside getData, not the window object
               this.interval
            );
        },

        /*
         * Sets current group
         * @param {Object} group - object for group containing hash, groupName, friendlyName
         * @return {Undefined}
         *
        */
        setGroup : function (group) {

            this.$el.addClass("loading");
            clearTimeout(this.loop);
            this.group = group.groupName;
            this.$clearingTitle.text(group.friendlyName);

            // reset setTimout
            this.loop = setTimeout(
               $.proxy(this.getData, this), // ensures 'this' is the poller obj inside getData, not the window object see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FOperators%2Fthis#Method_binding for setTimeout this issue
               this.interval
            );
        },

        /*
         * Renders results
         * @param {Object} dataObj - containing data to be renderered
         * @return {Undefined}
         *
        */
        render : function (dataObj) {
            this.$el.removeClass("loading").empty();
            this.$el.append(_.template(this.template, dataObj));
        },

        /*
         * Handles errors on ajax call
         *
         * @return {Undefined}
         *
        */
        errorHandler : function () {
            if (this.firstRun) {
                // maybe the first run failed, if so we still need to set firstRun to false
                this.firstRun = false;
                // runs straight away first time, then every 5 seconds after that
                this.interval = 5000;
            }

            this.failed = this.failed + 1;

            // only recurse while there's less than 10 failed requests.
            // otherwise the server might be down or is experiencing issues.
            if (this.failed < 10 ) {

                // give the server some breathing room by
                // increasing the interval
                this.interval = this.interval + 1000;

                // recurse
                this.init();
            } else {
                // we have run out of try's, maybe reloading page will help
                this.$el.removeClass("loading").empty().html("<p class=\"error\">Error fetching data. Page will reload in 10 seconds...</p>");
                setTimeout(
                    this.windowReload,
                10000);
            }
        },

        /*
         * Gets AJAX data and responds to it
         *
         * @return {Undefined}
         *
        */
        getData : function () {
            // self should now refer to APP if getData is called using $proxy
            // need to cache 'this' here as 'this' will refer to success fn in success fn
            //var that = this;

            $.ajax({
                type     : "get",
                async    : false,
                dataType : "xml",
                url      : this.SOL_URL + new Date().getTime(), // cache bust
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
                        title : this.group                           // title of group
                    },
                    $row = $(data).find("row[name='" + APP.group + "']");

                    if (this.firstRun) {
                        this.firstRun = false;
                        // runs straight away first time, then every 5 seconds after that
                        this.interval = 5000;
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
                    this.render(dataObj);

                    this.init(); // recurse on success

                }, // end success
                error : $.proxy(this.errorHandler, this)
            }); // end $.ajax
        } // end getData fn
    //; // end vars

/*    return {
        group: group,
        setGroup : setGroup,
        render: render,
        interval : interval,
        getData : getData,
        firstRun : firstRun,
        errorHandler : errorHandler,
        init : init
    };*/

    };

APP.init();


