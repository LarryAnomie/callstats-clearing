/*global _*/
var APP = (function (w, d, $, _) {

    var SOL_URL = "sol.php?url=" + encodeURI("http://10.2.21.132:8181/WebDisplay.xml?NoCache="),    // source data url
        interval = 5000,                                                                            // default polling to 1 second
        firstRun = true,                                                                            // true until after first ajax rrequest
        group = "Main Clearing",                                                                    // default to Main Clearing Group
        $clearingTitle = $("#clearing-title"),                                                      // title of group
        $menu = $("#menu"),                                                                         // menu
        $menuToggler = $("#menu-toggler"),                                                          // menu toggler
        $app = $("#app"),                                                                           // container for template
        failed = 0,                                                                                 // keep track of how many ajax requests failed

        /* jshint -W015 */
        template = [
            "<dl class=\"call-stat primary clearfix\">",
                "<dt class=\"call-queue\">Calls in queue:</dt>",
                "<dd class=\"call-queue-stat <%= inQueueClass %>\"><%= inQueue %></dd>",
            "</dl>",
            "<dl class=\"call-stat secondary clearfix\">",
                "<dt class=\"call-agents-logged-on\">Agents logged on:</dt>",
                "<dd class=\"call-agents-logged-on-stat okay\"><%= agentsLoggedOn %></dd>",
                "<dt class=\"call-agents-available \">Agents availabile:</dt>",
                "<dd class=\"call-agents-available-stat <%= agentsClass %>\"><%= agentsAvailable %></dd>",
                "<dt class=\"call-calls-answered\">Calls answered:</dt>",
                "<dd class=\"call-calls-answered-stat null\"><%= answered %></dd>",
                "<dt class=\"call-percentage-missed\">% Calls missed:</dt>",
                "<dd class=\"call-percentage-missed-stat <%=missedClass %>\"><%= missed %></dd>",
                "<dt class=\"call-agents-wait-time\">Average wait time:</dt>",
                "<dd class=\"all-agents-wait-time-stat null\"><%= waitTimeFormated %></dd>",
            "</dl>",
        ].join("\n"),
        /* jshint +W015 */

        groups = [
            {
                friendlyName : "Main Clearing",
                groupName : "Main Clearing",
                hash : ""
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
                hash : ""
            },
            {
                friendlyName : "Clearing SEMS Maths",
                groupName : "SEMS Maths",
                hash : ""
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
        setGroup = function(group) {
            APP.group = group;
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


    // event handler for menu clicks
    $menu.on("click", "a", function(e) {
        var $this = $(e.target);

        if ($this.is("span")) {
            $this = $this.parent("a");
        }

        APP.setGroup($this.data("clearing-group"));

        //e.preventDefault();
    });

    //menu toggler
    $menuToggler.on("click", function(e) {
        e.preventDefault();
        $menu.toggleClass("active");
    });

    // kickoff update
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
                        missed : 0,                             // number of calls missed
                        agentsAvailable : 0,                    // number of agents available to take call in group
                        agentsLoggedOn : 0,                     // number of agents logged on in group
                        inQueue : 0,                            // number of calls in group call
                        averageWait : [0.0, 0.0],               // average wait time till call answered
                        totalObjects : 0,                       // number of rows
                        waitTimeTotal : 0,                      // total wait time for all groups in seconds
                        waitTimeCalculated : 0,                 // calculated wait time in seconds
                        waitTimeFormated : "",                  // calculated wait time formatted for display
                        title : group                           // title of group
                    },
                    row = $(data).find("row[name='" + APP.group + "']");

                    //console.log($(data).find("row[name='" + APP.group + "']"));

                    // enumerate over each row in xml file adding up numbers for each group to get a total
/*                    $(data).find("config").children().each(function (i) {*/

                        var tempSecs,                   // temp var to contain seconds for this row
                            $this = $(this),            // xml row
                            name = $this.attr("name");  // name of group

                        // Skip the first area as this contains the headings
                        if (i === 0) {
                            return;
                        }

                        dataObj.answered += parseInt($this.find("seg:eq(2)").text(), 10);
                        dataObj.missed += parseInt($this.find("seg:eq(4)").text(), 10);
                        dataObj.agentsAvailable += parseInt($this.find("seg:eq(6)").text(), 10);
                        dataObj.agentsLoggedOn += parseInt($this.find("seg:eq(12)").text(), 10);
                        dataObj.inQueue += parseInt($this.find("seg:eq(8)").text(), 10);
                        tempSecs = $this.find("seg:eq(10)").text();
                        //tempSecs = "12:50"; // for testing

                        // convert to seconds
                        tempSecs = hmsToSecondsOnly(tempSecs);

                        // add to our running total
                        dataObj.waitTimeTotal += tempSecs;

                        // increase counter for each row processed
                        dataObj.totalObjects += 1;

/*                    }); // end each loop*/


                    // after looping through each row we need to work out what class each dataObj value requires

                    // figure missed calls class
                    if (dataObj.missed > 10) {
                        // more than 10 missed calls is bad
                        dataObj.missedClass = "bad";
                    } else if (dataObj.missed > 4) {
                        // more than 4 is middling
                        dataObj.missedClass = "okay";
                    } else {
                        // less than 4 is good
                        dataObj.missedClass = "good";
                    }

                    // figure out agents available class
                    if (dataObj.agentsAvailable <= 0) {
                        dataObj.agentsClass = "bad";
                    } else {
                        dataObj.agentsClass = "good";
                    }

                    // figure out calls in queue class
                    if (dataObj.inQueue >= 2) {
                        dataObj.inQueueClass = "bad";
                    } else if (dataObj.inQueue >= 1) {
                        dataObj.inQueueClass = "okay";
                    } else {
                        dataObj.inQueueClass = "good";
                    }

                    //console.log("total wait time in seconds = ", dataObj.waitTimeTotal);

                    // calculate waitTime in seconds - at this point we have a total wait time in seconds
                    // dividing total waiting time by number of groups gives an average total wait time in seconds for all groups
                    dataObj.waitTimeCalculated = dataObj.waitTimeTotal / dataObj.totalObjects;

                    //console.log("wait time calculated = ", dataObj.waitTimeCalculated);

                    // convert total seconds to HH:MM:SS format
                    dataObj.waitTimeFormated = secondsToHms(dataObj.waitTimeCalculated);

                    //console.log("waited time formated =", dataObj.waitTimeFormated);

                    // render the template
                    $app.empty();
                    $app.append(_.template(template, dataObj));

                    loopsiloop(); // recurse

                }, // end success
                error : function () {
                    // only recurse while there's less than 10 failed requests.
                    // otherwise the server might be down or is experiencing issues.
                    if ( ++failed < 10 ) {

                        // give the server some breathing room by
                        // increasing the interval
                        interval = interval + 1000;
                        loopsiloop(interval);
                    }
                }
            }); // end $.ajax
        }, interval); // end setTimeout
    }()); // end loopsiloop

    return {
        group: group,
        setGroup : setGroup
    };

}(window, document, jQuery, _, null));



