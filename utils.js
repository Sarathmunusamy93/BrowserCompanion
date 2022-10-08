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

let URLDetails = [];
var domainDetails = {};
var pieChart;

$("#resetChart").click(function (event) {
  $(".chartFilterBtn").attr("style", "background-color:white");
  showBrowserHistroyData(null);
});

$("#todayFilter").click(function (event) {
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

function removeFilterBtnHighlight() {
  $(".chartFilterBtn").css("background-color", white);
}

function fetchBrowserHistory() {
  fetchBrowserHistoryCE(function (data) {
    data.forEach(function (page) {
      let URLDetail = {
        domain: new URL(page.url).origin,
        fullURL: page.url,
        activeTime: null,
        noOfVisit: page.visitCount,
        lastVisited: page.lastVisitTime,
      };

      setTimeout(() => {
        add(
          "TrackMeHistoryList",
          "TrackMeHistoryListDB",
          URLDetail,
          false,
          function (result) {
            console.log(result);
          }
        );
      }, 100);
    });

    redirectToDashboardPage();
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
    "background-color: #e03997!important; color:white !important"
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

    result.lastVisited = convertDate2Momentjs(result.lastVisited);

    if (filter && result.lastVisited && filter.startDate) {
      isfiltered = false;
      if (
        filter.endDate >= result.lastVisited &&
        filter.startDate <= result.lastVisited
      )
        isfiltered = true;
    } else if (filter && result.lastVisited && filter > result.lastVisited) isfiltered = false;

    if (isfiltered) {
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
        itemColor.push(getRandomColor());
      } else {
        domainDetails[result.domain].visitedCount =
          domainDetails[result.domain].visitedCount + 1;
      }

      domainDetails[result.domain].visitedDetails.push({
        lastVisited: result.lastVisited,
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

  renderHistroyOnTable(urlDomain, visitedCount);

  if (pieChart != null) {
    pieChart.destroy();
  }

  renderChartItems(urlDomain, visitedCount, itemColor);
}

function renderSiteHistroyOnTable(vistedData, label) {
  $("#histroyDetails").hide();
  $("#siteHistroyDetails").show();

  $("#tblheaderRow").html("");
  $("#activesTableBody").html("");

  $("#chartInfo").html(label);

  var tblheaderRow =
    '<tr id="row">  <th> Date  </th>  <th> Mins Spend </th> </tr>';
  $("#siteHistroyDetails").append(tblheaderRow);

  let totalVisitedHours = 0;

  vistedData.forEach(function (data, index) {
    totalVisitedHours += data.totalActiveHours;

    var tbleBodyRow =
      '<tr id="row' +
      index +
      '">  <td data-label="domain">  ' +
      new Date(data.lastVisited).toLocaleDateString() +
      '  </td>  <td data-label="count"> ' +
      data.totalActiveHours +
      " </td> ";

    $(" #activesTableBody").append(tbleBodyRow);
    if (vistedData.length - 1 == index) {
      var tbleBodyLastRow =
        '<tr id="row' +
        index +
        '">  <td data-label="domain"> <b> Total  </b>  </td>  <td data-label="count"> <b>' +
        totalVisitedHours +
        "</b> </td> ";
      $(" #activesTableBody").append(tbleBodyLastRow);
    }
  });
}

function renderHistroyOnTable(siteDomains, visitCount) {
  $("#siteHistroyDetails").hide();
  $("#histroyDetails").show();
  $(" #historyTableBody").html("");
  $("#historyTableHeaders").html("");

  var tblheaderRow =
    '<tr id="row">  <th> Site Domain  </th>  <th> Number of visited </th> </tr>';

  $(" #historyTableHeaders ").append(tblheaderRow);

  siteDomains.forEach(function (siteDomain, index) {
    var tbleBodyRow =
      '<tr id="row' +
      index +
      '">  <td data-label="domain">  ' +
      siteDomain +
      '  </td>  <td data-label="count"> ' +
      visitCount[index] +
      " </td> ";
    $(" #historyTableBody").append(tbleBodyRow);
  });

  $(".sortable.table").tablesort();
}

function toogleSideBar() {
  console.log("loadded");
  $(".ui.sidebar").sidebar("toggle");
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

  pieChart = new Chart(ctx, {
    type: "pie",
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

  siteCanvas.onclick = function (evt) {
    var activePoints = pieChart.getElementsAtEvent(evt);
    if (activePoints[0]) {
      var chartData = activePoints[0]["_chart"].config.data;
      var idx = activePoints[0]["_index"];

      var label = chartData.labels[idx];
      var value = chartData.datasets[0].data[idx];

      if (domainDetails[label] && domainDetails[label].visitedDetails)
        renderSiteHistroyOnTable(domainDetails[label].visitedDetails, label);
    } else {
      $("#siteHistroyDetails").hide();
      $("#histroyDetails").show();
    }
  };
}

function getRandomColor() {
  var letters = "0123456789ABCDEF".split("");
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

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

  moment.weekdays().forEach(function (day, index) {
    var optionDom = '<option value="' + (index + 1) + '">' + day + "</div>";
    $("#recurringDaysOptions").append(optionDom);
  });

  $("#recurringDateValue").hide();

  $(".addNewRecurringRemainder").hide();
  $("#recurringReminder").click(function () {
    $(".addNewRecurringRemainder").show();
    $(".addNewRemainderForOneTime").hide();
    $("#oneTimeReminder").prop("checked", false);
  });

  $("#recurringDaysOptionsValue").change(function (event) {
    var selectedText = $(".recurringDaysOptionsValues:selected").text();
    if (selectedText == "Monthly") {
      $("#recurringDateValue").show();
      $(".recurringDurationOptionDays").hide();
    } else if (selectedText == "Weekly") {
      $("#recurringDateValue").hide();
      $(".recurringDurationOptionDays").show();
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
    results.forEach(function (remainder, index) {
      var tblRow =
        '  <tr id="row' +
        index +
        '">  <td data-label="DateTime">  ' +
        remainder.dateTime +
        '  </td>  <td data-label="Message"> ' +
        remainder.Message +
        " </td> " +
        '<td data-label="TargetURL"> ' +
        remainder.targetURL +
        " </td>" +
        "</td> " +
        '<td data-label="TargetURL"> <i class="large delete outline icon" id=' +
        remainder.id +
        '></i> <i class="large edit outline icon"></i></td>' +
        "<tr>";

      $(" #RemainderTableBody ").append(tblRow);
    });
  };

  getAll("RemaindME", "RemaindMEDB", renderRemainder);
}

function saveRemaindar() {
  var dateTime = $("#dateValue").val() + " " + $("#timeValue").val();

  var remainder = {
    dateTime: $("#dateValue").val() + " " + $("#timeValue").val(),
    Message: $("#message").val(),
    isURLLaunchEnabled: $("#launchURL").is(":checked"),
    targetURL: $("#targetURL").val(),
  };

  setAlarmForReminder = function (result) {
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

$(document.body).on("click", ".delete", function (event) {
  deleteRemainder(parseInt(event.target.id));
  $("#RemainderTableBody").html("");
  fetchRemainder();
});

function deleteRemainder(id) {
  del("RemaindME", "RemaindMEDB", id, true);
}
