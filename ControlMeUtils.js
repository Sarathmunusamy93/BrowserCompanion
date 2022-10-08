$(document).ready(function () {
  $(".ui.dropdown").dropdown();

  renderControlSitesList();

  $("#controlsDetailsTableBody").on("click", "#controlStatus", function () {
    if ($(this).hasClass("active")) {
      $(this).removeClass("active");
      $(this).text("Disabled");
    } else {
      $(this).addClass("active");
      $(this).text("Active");
    }
  });

  $("#getAllLS").click(function (event) {
    chrome.runtime.sendMessage({
      type: "getAllLS",
      options: {
        allURL: "yes",
      },
    });
  });
});

$("#clearLS").click(function () {
  chrome.runtime.sendMessage({
    type: "clearLS",
    options: {
      allURL: "yes",
    },
  });
});

$("#addSiteControl").click(function (event) {
  var controlEntry = {
    targetURL: $("#controlSiteURL").val(),
    basis: $(".dropdown").dropdown("get text")[0],
    hours: $("#controlHours").val(),
    status: true,
  };

  add(
    "controlSiteBase",
    "ControlSiteDB",
    controlEntry,
    false,
    function (id, controlSiteDetails) {
      renderControlSitesList();
      saveControlSiteInlocalStorage(controlSiteDetails);
    }
  );
});

function saveControlSiteInlocalStorage(cntrlSiteDetails) {
  var validityDate = 0;

  if (cntrlSiteDetails.basis) {
    switch (cntrlSiteDetails.basis) {
      case "Weekly":
        validityDate = 7;
        break;
      case "Monthly":
        validityDate = 30;
        break;
      case "Daily":
        validityDate = 1;
        break;
      default:
        validityDate = 0;
        break;
    }
  }

  var controlSiteInstance = {
    status: cntrlSiteDetails.status,
    basis: validityDate,
    restrictedHour: parseInt(cntrlSiteDetails.hours),
    activeTime: 0,
    targetUrl: cntrlSiteDetails.targetURL,
    startedTime: new Date(),
  };

  chrome.storage.sync.get("restrictedSitesDeatils", function (result) {
    var allResirectedSites = [];
    if (
      Object.keys(result).length &&
      result &&
      result != "" &&
      result.restrictedSitesDeatils
    ) {
      allResirectedSites = JSON.parse(result.restrictedSitesDeatils);

      allResirectedSites.push(controlSiteInstance);
    } else {
      allResirectedSites.push(controlSiteInstance);
    }

    chrome.storage.sync.set({
      restrictedSitesDeatils: JSON.stringify(allResirectedSites),
    });

    chrome.runtime.sendMessage({
      type: "createAlarmForControlRenewal",
      options: {
        controlSiteInstance,
      },
    });
  });

  //   chrome.storage.sync.set(
  //     {
  //       [cntrlSiteDetails.targetURL + "_" + cntrlSiteDetails.basis]:
  //         JSON.stringify(controlSiteInstance),
  //     },
  //     function () {}
  //   );

  //   chrome.storage.sync.get

  console.log(cntrlSiteDetails);
}
function renderControlSitesList() {
  fun = function (results) {
    results.forEach((result, index) => {
      var statusButton = result.status
        ? '<button class="ui toggle button active" id="controlStatus">Active</button> '
        : '<button class="ui toggle button" id="controlStatus">Disabled</button> ';

      var tblRow =
        '  <tr id="row' +
        index +
        '"> <td data-label="DateTime"> ' +
        statusButton +
        '  </td>  <td data-label="DateTime">  ' +
        result.targetURL +
        '  </td>  <td data-label="Message"> ' +
        result.basis +
        " </td> " +
        '<td data-label="TargetURL"> ' +
        result.hours +
        " </td></tr>";

      $(" #controlsDetailsTableBody ").append(tblRow);
    });
  };

  $(" #controlsDetailsTableBody ").html("");
  getAll("controlSiteBase", "ControlSiteDB", fun);
}
