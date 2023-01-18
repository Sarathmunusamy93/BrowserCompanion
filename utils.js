document.getElementById("historyImport")
  ? document
      .getElementById("historyImport")
      .addEventListener("click", fetchBrowserHistory)
  : null;
document.getElementById("startNow")
  ? document
      .getElementById("startNow")
      .addEventListener("click", redirectToDashboardPage)
  : null;
document.getElementById("toogleSideBar")
  ? document
      .getElementById("toogleSideBar")
      .addEventListener("click", toogleSideBar)
  : null;
document.getElementById("filterStartDate")
  ? document
      .getElementById("filterStartDate")
      .addEventListener("change", enableEndDate)
  : null;
//window.addEventListener("beforeunload", closedWindow);

document.getElementById("filterEndDate")
  ? document
      .getElementById("filterEndDate")
      .addEventListener("change", advancedFiltering)
  : null;

//document.getElementsByClassName('chartFilterBtn') ? document.getElementsByClassName('chartFilterBtn').addEventListener("click", filterChartData) : null;
document.addEventListener("DOMContentLoaded", fetchRemainder);

document.getElementById("addRemainder")
  ? document
      .getElementById("addRemainder")
      .addEventListener("click", saveRemaindar)
  : null;

document.getElementById("addRecurringRemainder")
  ? document
      .getElementById("addRecurringRemainder")
      .addEventListener("click", saveRemaindar)
  : null;

let URLDetails = [];
var domainDetails = {};
var pieChart, weekChart, dayChart, hoursChart, timeSpendChart;

$("#cancelRecurringRemainder, #cancelRemainderInputs").click(function (event) {
  emptyRemainderFields();
});

$("#resetChart").click(function (event) {
  $(".chartFilterBtn").attr("style", "background-color:white");
  domainDetails = {};
  showBrowserHistroyData(null);
});

$("#todayFilter").click(function (event) {
  chrome.topSites.get(function (results) {
    console.log(results);
  });
  filterChartData("day", event.currentTarget.id);
});

$("#weekFilter").click(function (event) {
  filterChartData("week", event.currentTarget.id);
});
$("#monthFilter").click(function (event) {
  filterChartData("month", event.currentTarget.id);
});
$("#yearFilter").click(function (event) {
  filterChartData("year", event.currentTarget.id);
});

$(document.body).on("click", ".edit", function (event) {
  editReminder(event);
});

function editReminder(event) {
  let id = parseInt(event.target.id),
    parentRowID = $($(event.target).closest("tr")).attr("id"),
    recurringFrequency = $("#" + parentRowID + " .recurringFrequency").html(),
    dateTime = $("#" + parentRowID + " .DateTime").html(),
    message = $("#" + parentRowID + " .Message").html(),
    targetURL = $("#" + parentRowID + " .TargetURL").html();

  if (recurringFrequency == "One Time") {
    $("#oneTimeReminder").click();
    $("#dateValue").calendar("set date", new Date(dateTime).toISOString());
    $("#timeValue").calendar("set date", new Date(dateTime).toTimeString());
    $("#message").val(message);
    $("#targetURL").val(targetURL);

    deleteRemainder(parseInt(event.target.id));
  } else {
    $("#recurringReminder").click();
    let duration = $(".recurringDurationOption .text").val(),
      dropdownDurationMenu = $(".recurringDurationOption .menu .item"),
      durationIndex = 0;

    if (recurringFrequency.replace(" ", "") == "Monthly") {
      $(dropdownDurationMenu)[2].click();
      $("#recurringDate").calendar(
        "set date",
        new Date(dateTime).toISOString()
      );
      $("#recurringTime").calendar(
        "set date",
        new Date(dateTime).toTimeString()
      );
      $("#recurringMessage").val(message);
      $("#recurringTargetURL").val(targetURL);
    } else {
      if (recurringFrequency.replace(" ", "") == "Weekly") {
        let indexFirstNumber = dateTime.search(/\d/),
          dayConstrain = dateTime.substr(0, indexFirstNumber - 1),
          timeConstrain = dateTime.substr(
            indexFirstNumber,
            dateTime.length - 1
          ),
          dayDropdownOptions = $(".recurringDurationOptionDays .menu .item"),
          daysOptions = [
            "All Days",
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          selectedOptions = daysOptions.indexOf(dayConstrain);

        $(dayDropdownOptions)[selectedOptions].click();

        $(dropdownDurationMenu)[1].click();
        $("#recurringMessage").val(message);
        $("#recurringTargetURL").val(targetURL);
        $("#recurringTime").calendar("set date", timeConstrain);
      } else {
        $(dropdownDurationMenu)[0].click();
      }
    }
  }

  deleteRemainder(id);
}

function removeFilterBtnHighlight() {
  $(".chartFilterBtn").css("background-color", white);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message == "History Loaded") {
    // Filter out other messages
    redirectToDashboardPage();
  } else if (request.message == "HistoryListedSaved") {
    if (window.location.pathname.indexOf("/MainPage.html") == -1) {
      redirectToDashboardPage();
    }
  }
});

function fetchBrowserHistory() {
  chrome.runtime.sendMessage({
    type: "fetchBrowserHistoryCE",
  });
}
function redirectToDashboardPage() {
  let url = chrome.runtime.getURL("MainPage.html");

  chrome.tabs.update(undefined, { url: url });
}

window.onload = function loadChartItems() {
  if (window.location.pathname.indexOf("/MainPage.html") > -1) {
    showBrowserHistroyData();
  }
};

function filterChartData(filterDetails, targetElement) {
  $(".chartFilterBtn").attr("style", "background-color:white");

  $("#" + targetElement).attr(
    "style",
    "background-color: #7ec8e3ff!important; color:white !important"
  );

  var todayDate = new Date();

  // Reset the domain details.
  domainDetails = {};

  if (filterDetails == "day") {
    compiledDate = new Date(todayDate).setDate(todayDate.getDate());
  } else if (filterDetails == "year") {
    compiledDate = new Date(todayDate.setFullYear(todayDate.getFullYear() - 1));
  } else if (filterDetails == "month") {
    compiledDate = new Date(todayDate.setMonth(todayDate.getMonth() - 1));
  } else if (filterDetails == "week") {
    compiledDate = new Date(todayDate).setDate(todayDate.getDate() - 7);
  }

  showBrowserHistroyData(convertDate2Momentjs(compiledDate));
}

function showBrowserHistroyData(filter) {
  //get data
  func = function (results) {
    renderChartBasedOnInputs(results, filter);
  };

  getAll("TrackMeHistoryList", "TrackMeHistoryListDB", func);
}

function renderChartBasedOnInputs(inputData, filter) {
  var itemColor = [];

  inputData.forEach(function (result, index) {
    var isfiltered = true;

    result.lastVisitedTime = new Date(result.lastVisited).getHours();
    result.lastVisited = convertDate2Momentjs(result.lastVisited);

    if (filter && result.lastVisited && filter.startDate) {
      isfiltered = false;
      if (
        filter.endDate >= result.lastVisited &&
        filter.startDate <= result.lastVisited
      )
        isfiltered = true;
    } else if (filter && result.lastVisited && filter > result.lastVisited) isfiltered = false;

    if (isfiltered && result.domain != null) {
      // Check if domain instance is first time in domainDetails array.
      if (
        domainDetails[result.domain] == null ||
        domainDetails[result.domain] == undefined ||
        Object.entries(domainDetails[result.domain]).length == 0
      ) {
        domainDetails[result.domain] = {
          visitedCount: 1,
          visitedDetails: [],
        };
        itemColor.push(getRandomColor(itemColor));
      } else {
        domainDetails[result.domain].visitedCount =
          domainDetails[result.domain].visitedCount + 1;
      }

      domainDetails[result.domain].visitedDetails.push({
        lastVisited: result.lastVisited,
        lastVisitedTime: result.lastVisitedTime,
        totalActiveHours: result.activeTime,
      });
    }
    if (index == inputData.length - 1) {
      renderChartOnConstrains(domainDetails, itemColor);
    }
  });
}

function convertDate2Momentjs(targetDate) {
  return moment(new Date(targetDate).toLocaleDateString()).toDate();
}

function renderChartOnConstrains(domainDetails, itemColor) {
  var urlDomain = [];
  var visitedCount = [];

  Object.keys(domainDetails).map(function (key) {
    urlDomain.push(key);
    visitedCount.push(domainDetails[key].visitedCount);
  });

  renderHistroyOnTable(urlDomain, visitedCount, itemColor);

  if (pieChart != null) {
    pieChart.destroy();
  }

  renderChartItems(urlDomain, visitedCount, itemColor);
}

function renderSiteHistroyOnTable(vistedData, label) {
  $("#mainListBackButton").show();
  $(".MainTableInfo").hide();
  $("#histroyDetails").hide();

  $(".doughnetChartInfo span").html(
    "Information: <b>" + new URL(label).host + "</b>"
  );

  $("#chartClickInfo").hide();
  $("#timeSpendChart").show();
  $("#tblheaderRow").html("");
  $(".tabularDetails").hide();
  $("#activesTableBody").html("");
  $("#chartInfo").show();
  $("#chartInfo").html(
    "<b>Site Domain: </b> " +
      label +
      "<b style='padding-left:10px'>Visited Counts: </b> " +
      vistedData.length
  );

  // var tblheaderRow =
  //   '<tr id="row">  <th> Date  </th>  <th> Mins Spend </th> </tr>';
  // $("#siteHistroyDetails").append(tblheaderRow);

  let totalVisitedHours = 0,
    timeSpendByDate = {};

  vistedData.forEach(function (data, index) {
    totalVisitedHours += data.totalActiveHours;

    let currentDate = new Date(data.lastVisited).toLocaleDateString();

    if (timeSpendByDate[currentDate]) {
      timeSpendByDate[currentDate] +=
        data.totalActiveHours == null ? 0 : data.totalActiveHours;
    } else {
      timeSpendByDate[currentDate] =
        data.totalActiveHours == null ? 0 : data.totalActiveHours;
    }
  });

  showTimeSpendChart(timeSpendByDate, totalVisitedHours);
}

function showTimeSpendChart(data, totalHours) {
  $(".timeSpendChartInfo").html("Total Time Spend (mins): " + totalHours);

  let labelsData = Object.keys(data),
    values = Object.values(data);
  $(".timeSpendChart").show();
  var timeSpendCanvas = document.getElementById("timeSpendChartCanvas");
  var ctx = timeSpendCanvas.getContext("2d");
  var oilData = {
    labels: labelsData,
    datasets: [
      {
        data: values,
        backgroundColor: "#3498db",
      },
    ],
  };

  timeSpendChart = new Chart(ctx, {
    type: "line",
    data: oilData,
    options: {
      legend: {
        display: false,
      },
      tooltips: {
        mode: "index",
      },
    },
  });
}

function renderHistroyOnTable(siteDomains, visitCount, colors) {
  $("#timeSpendChart").hide();
  $(".MainTableInfo").show();
  $("#histroyDetails").show();
  // $(".tabularDetails").hide();
  $("#historyTableHeaders").html("");
  $(".tabularDetails").html("");
  // $(".tabularDetails").css("with", "");
  var tblheaderRow =
    '<tr id="row">  <th> Site Domain  </th>  <th> Number of visited </th> </tr>';

  $(" #historyTableHeaders ").append(tblheaderRow);

  // the array to be sorted
  var list = visitCount;

  // temporary array holds objects with position and sort-value
  var mapped = list.map(function (el, i) {
    return { index: i, value: el };
  });

  // sorting the mapped array containing the reduced values
  mapped.sort(function (a, b) {
    return b.value - a.value;
  });

  // container for the resulting order
  var result = mapped.map(function (el) {
    return list[el.index];
  });

  mapped.forEach(function (siteVisited, index) {
    let siteDomain = siteDomains[siteVisited.index],
      visitedCount = visitCount[siteVisited.index];

    if (isValidHttpUrl(siteDomain)) {
      let currentDomain = new URL(siteDomain).host,
        rank = index <= 10 ? "rank" : "";

      let siteDetails =
        '<div class="siteMiniContainer" id=' +
        index +
        '>  <span class="siteColor" style="background-color:' +
        colors[siteVisited.index] +
        '"> </span> <span class="siteDetailsName" id="' +
        siteDomain +
        '"> ' +
        currentDomain +
        " </span> -  <span>" +
        visitedCount +
        " </span> </div>";

      // var tbleBodyRow =
      //   '<tr id="row' +
      //   index +
      //   '">  <td data-label="domain">  ' +
      //   siteDomain +
      //   '  </td>  <td data-label="count"> ' +
      //   visitCount[index] +
      //   " </td> ";
      $(" .tabularDetails").append(siteDetails);
    }
  });

  $(".sortable.table").tablesort();
}

function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

function toogleSideBar() {
  console.log("loadded");
  $(".ui.sidebar").sidebar("toggle");
}

function getSiteTotals(sizeCount) {
  return "Total Visited Sites:" + sizeCount;
}

function renderChartItems(urlDomain, visitedCount, itemColor) {
  var siteCanvas = document.getElementById("siteHisoryChart");
  var ctx = siteCanvas.getContext("2d");
  var oilData = {
    labels: urlDomain,
    datasets: [
      {
        data: visitedCount,
        backgroundColor: itemColor,
      },
    ],
  };

  $(".doughnetChartInfo span").html("Site usage on this browser");

  $(".MainTableInfo span").html("Site visted counts");

  Chart.pluginService.register({
    beforeDraw: function (chart) {
      if (chart.config.options.elements.center) {
        // Get ctx from string
        var ctx = chart.chart.ctx;

        // Get options from the center object in options
        var centerConfig = chart.config.options.elements.center;
        var fontStyle = centerConfig.fontStyle || "Arial";
        var txt = centerConfig.text;
        var color = centerConfig.color || "#000";
        var maxFontSize = centerConfig.maxFontSize || 75;
        var sidePadding = centerConfig.sidePadding || 20;
        var sidePaddingCalculated =
          (sidePadding / 100) * (chart.innerRadius * 2);
        // Start with a base font of 30px
        ctx.font = "30px " + fontStyle;

        // Get the width of the string and also the width of the element minus 10 to give it 5px side padding
        var stringWidth = ctx.measureText(txt).width;
        var elementWidth = chart.innerRadius * 2 - sidePaddingCalculated;

        // Find out how much the font can grow in width.
        var widthRatio = elementWidth / stringWidth;
        var newFontSize = Math.floor(30 * widthRatio);
        var elementHeight = chart.innerRadius * 2;

        // Pick a new font size so it will not be larger than the height of label.
        var fontSizeToUse = Math.min(newFontSize, elementHeight, maxFontSize);
        var minFontSize = centerConfig.minFontSize;
        var lineHeight = centerConfig.lineHeight || 25;
        var wrapText = false;

        if (minFontSize === undefined) {
          minFontSize = 20;
        }

        if (minFontSize && fontSizeToUse < minFontSize) {
          fontSizeToUse = minFontSize;
          wrapText = true;
        }

        // Set font settings to draw it correctly.
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        var centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
        var centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
        ctx.font = fontSizeToUse + "px " + fontStyle;
        ctx.fillStyle = color;

        if (!wrapText) {
          ctx.fillText(txt, centerX, centerY);
          return;
        }

        var words = txt.split(" ");
        var line = "";
        var lines = [];

        // Break words up into multiple lines if necessary
        for (var n = 0; n < words.length; n++) {
          var testLine = line + words[n] + " ";
          var metrics = ctx.measureText(testLine);
          var testWidth = metrics.width;
          if (testWidth > elementWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
          } else {
            line = testLine;
          }
        }

        // Move the center up depending on line height and number of lines
        centerY -= (lines.length / 2) * lineHeight;

        for (var n = 0; n < lines.length; n++) {
          ctx.fillText(lines[n], centerX, centerY);
          centerY += lineHeight;
        }
        //Draw text in center
        ctx.fillText(line, centerX, centerY);
      }
    },
  });

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: oilData,

    options: {
      plugins: {
        datalabels: {
          backgroundColor: function (context) {
            return context.dataset.backgroundColor;
          },
          borderRadius: 4,
          color: "white",
          font: {
            weight: "bold",
          },
          formatter: Math.round,
          padding: 6,
        },
      },
      legend: {
        display: false,
      },
      tooltips: {
        mode: "index",
      },
      hover: {
        mode: "nearest",
        intersect: false,
        onHover: function (e, item) {
          $(".siteMiniContainer").removeClass("highlighedSite");

          var activePoints = pieChart.getElementsAtEvent(e);
          if (activePoints[0]) {
            var chartData = activePoints[0]["_chart"].config.data,
              idx = activePoints[0]["_index"],
              label = chartData.labels[idx],
              targetURL = new URL(label).host;

            $(".siteMiniContainer:contains(" + targetURL + ")").addClass(
              "highlighedSite"
            );

            let targetID = $(
              ".siteMiniContainer:contains(" + targetURL + ")"
            ).attr("id");

            $(".tabularDetails").scrollTo(".siteMiniContainer#" + targetID);
          }
        },
      },
      elements: {
        center: {
          text: getSiteTotals(urlDomain.length),
          color: "#000000", // Default is #000000
          fontStyle: "Arial", // Default is Arial
          sidePadding: 20, // Default is 20 (as a percentage)
          minFontSize: 25, // Default is 20 (in px), set to false and text will not wrap.
          lineHeight: 25, // Default is 25 (in px), used for when text wraps
        },
      },
    },
  });

  siteCanvas.onclick = function (evt) {
    pieChart.update();
    var activePoints = pieChart.getElementsAtEvent(evt);
    if (activePoints[0]) {
      var chartData = activePoints[0]["_chart"].config.data;
      var idx = activePoints[0]["_index"];

      activePoints[0]["_model"].innerRadius =
        activePoints[0]["_model"].innerRadius + 10;
      activePoints[0]["_model"].outerRadius =
        activePoints[0]["_model"].outerRadius + 10;

      var label = chartData.labels[idx];
      var value = chartData.datasets[0].data[idx];

      pieChart.render(300, false);

      if (domainDetails[label] && domainDetails[label].visitedDetails) {
        renderSiteHistroyOnTable(domainDetails[label].visitedDetails, label);
        renderhelperCharts(domainDetails[label].visitedDetails);
      }
    } else {
      backToMainList();
    }
  };
}

function backToMainList() {
  $("#mainListBackButton").hide();
  $("#chartClickInfo").show();
  $(".MainTableInfo").show();
  $(".doughnetChartInfo span").html("Site usage on this browser");

  $("#timeSpendChart").hide();
  $("#histroyDetails").show();
  $("#chartInfo").hide();
  $(".tabularDetails").css("display", "grid");
  $(".helperChartsContainer").hide();
}

function renderhelperCharts(visitedDetails) {
  // render By weeks
  let dataByWeek = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    },
    dataByDate = generateDaySet(),
    dataByHours = generateHoursSet();
  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  $(".helperChartsContainer").show();
  visitedDetails.forEach(function (data, index) {
    if (data.lastVisited) {
      let currentDay = weekday[data.lastVisited.getDay()],
        currentHours = "0" + data.lastVisitedTime + ":00",
        currentDate = data.lastVisited.getDate();

      dataByDate[currentDate] += 1;
      dataByHours[currentHours] += 1;
      dataByWeek[currentDay] += 1;
    }
  });

  if (weekChart != null && dayChart != null && hoursChart != null) {
    weekChart.destroy();
    dayChart.destroy();
    hoursChart.destroy();
  }

  renderDaysChart(dataByDate);
  renderHoursChart(dataByHours);
  renderWeekChart(weekday, dataByWeek);
}

function renderDaysChart(dataByDate) {
  var siteCanvasHoursChart = document.getElementById("siteHisoryChartByDays");
  var ctx = siteCanvasHoursChart.getContext("2d");
  var oilData = {
    labels: Object.keys(dataByDate),
    datasets: [
      {
        data: Object.values(dataByDate),

        // backgroundColor: getColorForItems(7),
        fill: false,
        backgroundColor: "#3498db",
      },
    ],
  };

  hoursChart = new Chart(ctx, {
    type: "line",
    data: oilData,
    options: {
      legend: {
        display: false,
      },
      tooltips: {
        mode: "index",
      },
    },
  });
}

function renderHoursChart(dataByHours) {
  var siteCanvasHoursChart = document.getElementById("siteHisoryChartByHours");
  var ctx = siteCanvasHoursChart.getContext("2d");
  var oilData = {
    labels: Object.keys(dataByHours),
    datasets: [
      {
        data: Object.values(dataByHours),

        fill: false,

        backgroundColor: "pink",
      },
    ],
  };

  hoursChart = new Chart(ctx, {
    type: "line",
    data: oilData,
    options: {
      legend: {
        display: false,
      },
      tooltips: {
        mode: "index",
      },
    },
  });
}

function renderWeekChart(weekday, dataByWeek) {
  var siteCanvasWeekChart = document.getElementById("siteHisoryChartByWeek");
  var ctx = siteCanvasWeekChart.getContext("2d");
  var oilData = {
    labels: weekday,
    datasets: [
      {
        data: [
          dataByWeek.Sunday,
          dataByWeek.Monday,
          dataByWeek.Tuesday,
          dataByWeek.Wednesday,
          dataByWeek.Thursday,
          dataByWeek.Friday,
          dataByWeek.Saturday,
        ],

        backgroundColor: getColorForItems(7),
        fill: false,
      },
    ],
  };

  weekChart = new Chart(ctx, {
    type: "bar",
    data: oilData,
    options: {
      legend: {
        display: false,
      },
      tooltips: {
        mode: "index",
      },
    },
  });
}

function generateDaySet() {
  let targetObject = {};

  for (let index = 0; index < 32; index++) {
    targetObject[index] = 0;
  }

  return targetObject;
}

function generateHoursSet() {
  let targetObject = {};

  for (let index = 0; index < 25; index++) {
    let time = "0" + index + ":00";
    targetObject[time] = 0;
  }

  return targetObject;
}

function getColorForItems(count) {
  let colors = [];

  for (let index = 0; index < count; index++) {
    colors.push(getRandomColor(colors));
  }
  console.log(colors);
  return colors;
}

function getRandomColor(currentColors) {
  var letters = "0123456789ABCDEF".split("");
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  if (currentColors) {
    if (currentColors.indexOf(color) != -1) {
      console.log("It is duplicate color: " + color);
      getRandomColor(currentColors);
    } else {
      return color;
    }
  }

  return color;
}

let myVar = setInterval(myTimer, 100);

function myTimer() {
  let iconColor = getRandomColor() + "!important";

  $(".reminderMeInfo .info").attr("style", "color:" + iconColor);
  // $(".controlMeInfo .info").attr("style", "width: " + iconWidth);
}

setTimeout(function () {
  clearInterval(myVar);
  $(".reminderMeInfo .info").attr("style", "color:#2185d0 !important");
}, 2000);

function enableEndDate() {
  $("#filterEndDate").prop("disabled", false);
}

function advancedFiltering() {
  var startDate = $("#filterStartDate").val(),
    endDate = $("#filterEndDate").val();

  // Reset the domain details.
  domainDetails = {};

  startDate = convertDate2Momentjs(startDate);
  endDate = convertDate2Momentjs(endDate);
  if (startDate && endDate) {
    showBrowserHistroyData({ startDate, endDate });
  }
}

// ------------------- remainer Logics --------------------------
$(document).ready(function () {
  $(".ui.dropdown").dropdown({
    onchange: function (val) {
      console.log(val);
    },
  });

  if (window.location.href.indexOf("MainPage") != -1) {
    chrome.runtime.sendMessage({
      type: "checkHistoryListAvailable",
    });

    // window.location.href = window.location.href.replace(
    //   "MainPage",
    //   "StartPage"
    // );
  }

  $("#mainListBackButton").click(function (event) {
    backToMainList();
  });
  $(".timeSpendChart").hide();

  $(".tabularDetails").css("display", "grid");

  $("#dateValue").calendar({ type: "date" });

  $("#timeValue").calendar({ type: "time" });
  $("#recurringTime").calendar({ type: "time" });
  $("#recurringDate").calendar({ type: "date" });

  $("#recurringReminder").click(function () {
    $("#recurringReminder").addClass("positive");
    $("#oneTimeReminder").removeClass("positive");
    $("#recurringReminder").attr("checked", true);
    $("#oneTimeReminder").attr("checked", false);
    $(".reminderMeError").hide();
    $(".reminderMeError").html("");
  });
  $("#oneTimeReminder").click(function () {
    $("#oneTimeReminder").addClass("positive");
    $("#recurringReminder").removeClass("positive");
    $("#recurringReminder").attr("checked", false);
    $("#oneTimeReminder").attr("checked", true);
    $(".reminderMeError").hide();
    $(".reminderMeError").html("");
  });

  moment.weekdays().forEach(function (day, index) {
    var optionDom = '<option value="' + (index + 1) + '">' + day + "</div>";
    $("#recurringDaysOptions").append(optionDom);
  });

  $("#recurringDateValue").hide();
  $(".recurringDurationOptionDays").hide();

  $(".addNewRecurringRemainder").hide();
  $("#recurringReminder").click(function () {
    $(".addNewRecurringRemainder").show();
    $(".addNewRemainderForOneTime").hide();
    $("#oneTimeReminder").prop("checked", false);
  });

  $("#recurringDaysOptionsValue").change(function (event) {
    var selectedText = $(".recurringDaysOptionsValues:selected").val();
    if (selectedText == "2") {
      $("#recurringDateValue").show();
      $(".recurringDurationOptionDays").hide();
    } else if (selectedText == "1") {
      $("#recurringDateValue").hide();
      $(".recurringDurationOptionDays").show();
    } else {
      $("#recurringDateValue").hide();
      $(".recurringDurationOptionDays").hide();
    }
  });

  $("#oneTimeReminder").click(function () {
    $(".addNewRecurringRemainder").hide();
    $(".addNewRemainderForOneTime").show();
    $("#recurringReminder").prop("checked", false);
  });

  $("#clearAllHistoryItems").click(function (event) {
    clearAllHistory();
  });
});

function triggerPopup(helperText) {
  $("#operationInformation").show();
  $("#operationInformation").html(helperText);
  setTimeout(function () {
    $("#operationInformation").hide();
    $("#operationInformation").html("");
  }, 1500);
}

function clearAllHistory() {
  func = function () {
    triggerPopup("Items Deleted.....");
  };
  deleteAll("TrackMeHistoryList", "TrackMeHistoryListDB", func);
}

function handleRecurreringDurationChange(val) {
  console.log(val);
}

function fetchRemainder() {
  renderRemainder = function (results) {
    if (results.length < 1) {
      let emptyRow =
        '  <tr id="row"> <td data-label="DateTime" colSpan="5" style="text-align: center"> Add Any Reminder To Show Here!!!! </td></tr> ';
      $(" #RemainderTableBody ").append(emptyRow);
    } else {
      results.forEach(function (remainder, index) {
        let frequency = remainder.isRecurring
          ? remainder.frequency
          : "One Time";
        var tblRow = `  <tr id="row${index}">  <td data-label="recurringFrequency" class="recurringFrequency">${frequency}<td data-label="DateTime" class="DateTime">${remainder.dateTime}</td>  <td data-label="Message" class="Message">${remainder.Message}</td> <td data-label="TargetURL" class="TargetURL" >${remainder.targetURL} </td><td data-label="TargetURL"> <i class="large delete outline icon" id=${remainder.id}></i> <i class="large edit outline icon" id=${remainder.id}></i></td><tr>`;

        $(" #RemainderTableBody ").append(tblRow);
      });
    }
  };

  getAll("RemaindME", "RemaindMEDB", renderRemainder);
}

function saveRemaindar() {
  // var dateTime = $("#dateValue").val() + " " + $("#reminderTime").val();

  let isRecurringRemainder = $("#recurringReminder").attr("checked"),
    remainder = {},
    requency = $(".recurringDurationOption .text").text(),
    isValidationErrorOccurs = false;

  $(".reminderMeError").hide();
  $(".reminderMeError").html("");

  if (isRecurringRemainder) {
    let recurringDateValue = $("#recurringDateValue").val(),
      recurringTargetURL = $("#recurringTargetURL").val(),
      recurringDurationOption = $(".recurringDurationOption .text").text();

    if (
      recurringDurationOption != "" &&
      recurringTargetURL != "" &&
      recurringDurationOption != ""
    ) {
      remainder = {
        dateTime:
          (requency != "Monthly"
            ? $("#recurringDaysOptions :selected").text()
            : recurringDateValue) +
          " " +
          $("#recurringTimeValue").val(),
        Message: $("#recurringMessage").val(),
        isURLLaunchEnabled: $("#launchURL").is(":checked"),
        targetURL: recurringTargetURL,
        frequency: recurringDurationOption,
        isRecurring: true,
      };
    } else {
      isValidationErrorOccurs = true;
      showReminderMeError("Please fill all fields");
    }
  } else {
    let reminderDate = $("#reminderDate").val(),
      reminderTime = $("#reminderTime").val(),
      targetURL = $("#targetURL").val();

    if (reminderDate != "" && reminderTime != "" && targetURL != "") {
      remainder = {
        dateTime: $("#reminderDate").val() + " " + $("#reminderTime").val(),
        Message: $("#message").val(),
        isURLLaunchEnabled: $("#launchURL").is(":checked"),
        targetURL: $("#targetURL").val(),
        isRecurring: false,
      };
    } else {
      isValidationErrorOccurs = true;
      showReminderMeError("Please fill all fields");
    }
  }

  if (!isValidationErrorOccurs) {
    setAlarmForReminder = function (result) {
      emptyRemainderFields();

      $("#RemainderTableBody").html("");

      fetchRemainder();
      //createAlarmForRemainder(remainder, result);
      //code to send message to open notification. This will eventually move into my extension logic
      chrome.runtime.sendMessage({
        type: "createAlarmForReminder",
        options: {
          id: result,
          remainder,
        },
      });
    };

    add("RemaindME", "RemaindMEDB", remainder, false, setAlarmForReminder);
  }
}

function showReminderMeError(errorMsg) {
  $(".reminderMeError").show();
  $(".reminderMeError").html(errorMsg);
}

$(document.body).on("click", ".delete", function (event) {
  deleteRemainder(parseInt(event.target.id));
  $("#RemainderTableBody").html("");
  fetchRemainder();
});

$(document.body).on("click", ".siteMiniContainer", function (event) {
  let parentContainer = $(event.target).closest(".siteMiniContainer"),
    targetClass = $(parentContainer).find(".siteDetailsName");

  if (targetClass && targetClass[0]) {
    let label = $(targetClass).attr("id");
    if (domainDetails[label] && domainDetails[label].visitedDetails) {
      renderSiteHistroyOnTable(domainDetails[label].visitedDetails, label);
      renderhelperCharts(domainDetails[label].visitedDetails);
    }
  }
});

function emptyRemainderFields() {
  $("#reminderDate").val("");

  $("#reminderTime").val("");

  $("#message").val("");

  $("#targetURL").val("");

  $(".recurringDurationOption .text").val("");
  $("#recurringTimeValue").val("");

  $("#recurringMessage").val("");

  $("#recurringTargetURL").val("");
  $(".recurringDurationOptionDays .text").val("");

  $("#recurringDateValue").val("");
}

function deleteRemainder(id) {
  del("RemaindME", "RemaindMEDB", id, true);
}
