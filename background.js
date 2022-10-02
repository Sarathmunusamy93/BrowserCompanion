// try {
//     importScripts('./indexDBMode.js', './utils.js');
//   } catch (e) {
//     console.error(e);
//   }

//   if( 'function' === typeof importScripts) {
//     importScripts('script2.js');

//  }

import "./utils";
import "./indexDBModel";

// A lookup object containing open notifications.
var openURLPrompts = {};

var activeTabID;

chrome.runtime.onInstalled.addListener(async () => {
  let url = chrome.runtime.getURL("startpage.html");

  let tab = await chrome.tabs.create({ url });

  console.log(`Created tab ${tab.id}`);
});

function fetchBrowserHistoryCE(callback) {
  chrome.history.search({ text: "", maxResults: 10000 }, function (data) {
    callback(data);
  });
}

function createAlarmForRemainder(remainder, id) {
  chrome.alarms.create("remainder_" + id, {
    when: new Date(remainder.dateTime).getTime(),
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  let remainder_id = parseInt(alarm.name.split("_")[1]);

  getRemainderForAlarm(remainder_id, function (remainder_obj) {
    var targetURL = remainder_obj.targetURL;

    var notificationOptions = {
      type: "basic",
      iconUrl: "./img/android.png",
      title: "Track Me Remainder",
      message: remainder_obj.Message,

      buttons: [{ title: "Launch " + remainder_obj.targetURL }],
    };

    chrome.notifications.onButtonClicked.addListener(function (id, button) {
      var targetURL = openURLPrompts[id].targetURL;
      chrome.tabs.create({
        url: targetURL,
      });
    });

    // Display the notification.
    chrome.notifications.create(notificationOptions, function (id) {
      openURLPrompts[id] = { targetURL };

      deleteRemainder(remainder_obj.id);
    });
  });
});

function getRemainderForAlarm(remainder_id, callback) {
  func = function (result) {
    callback(result);
  };

  get("RemaindME", "RemaindMEDB", remainder_id, func);
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (
    changeInfo.status == "complete" &&
    tab.status == "complete" &&
    tab.url != "chrome://newtab/"
  ) {
    if (tab.active && activeTabID) {
      changeCurrentlyActiveTab(activeTabID, tabId);
    }

    activeTabID = tabId;
    saveNewTabInfoInLocalStorage(tab);
  }
});

function changeCurrentlyActiveTab(activeTabID, switchedTab) {
  var activeTabIDStr = activeTabID.toString();

  // Get the current tab and update its new status.
  chrome.storage.sync.get(activeTabIDStr, function (result) {
    if (Object.keys(result).length != 0) {
      // REVISIT
      var tabDetails = JSON.parse(Object.entries(result)[0][1]);

      tabDetails.activeTime =
        tabDetails.activeTime +
        diff_mins(new Date().getTime(), tabDetails.startTime);
      tabDetails.startTime = 0;
      tabDetails.isActiveTab = false;

      var key = parseInt(Object.entries(result)[0][0]);

      chrome.storage.sync.set(
        { [key]: JSON.stringify(tabDetails) },
        function () {}
      );
      activeTabID = switchedTab;
    } else if (tabInfo.url != "chrome://newtab/") {
      // Its new tab !!! save the instance to local storage.

      chrome.tabs.get(tabId, function (tabInfo) {
        saveNewTabInfoInLocalStorage(tabInfo);
      });
    }
  });
}

function saveNewTabInfoInLocalStorage(tabInfo) {
  let URLDetail = {
    domain: new URL(tabInfo.url).origin,
    fullURL: tabInfo.url,
    activeTime: null,
    noOfVisit: 0,
    lastVisited: new Date().getTime(),
    startTime: new Date().getTime(),
    isActiveTab: tabInfo.active,
  };

  var id = tabInfo.id;

  var result = JSON.stringify(URLDetail);

  console.log("ID: " + id + " result: " + result);
  chrome.storage.sync.set({ [id]: result });
}

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.sync.get(tabId.toString(), function (result) {
    var tabDetails = JSON.parse(Object.entries(result)[0][1]);
    saveTabInfo(tabDetails);
    chrome.storage.sync.remove(tabId, function () {});
  });
});

function diff_mins(dt2, dt1) {
  var diff = (dt2 - dt1) / (1000 * 60);
  return Math.abs(Math.round(diff));
}

function setCurrentTabAsActive(tabId) {
  // Get the current tab and update its new status.
  chrome.storage.sync.get(tabId.toString(), function (result) {
    if (Object.keys(result).length != 0) {
      // REVISIT
      var tabDetails = JSON.parse(Object.entries(result)[0][1]);

      tabDetails.startTime = new Date().getTime();
      tabDetails.isActiveTab = true;

      var key = parseInt(Object.entries(result)[0][0]);

      chrome.storage.sync.set(
        { [key]: JSON.stringify(tabDetails) },
        function () {}
      );
      activeTabID = key;
    } else {
      // Its new tab !!! save the instance to local storage.

      chrome.tabs.get(tabId, function (tabInfo) {
        if (tabInfo.status == "complete" && tabInfo.url != "chrome://newtab/")
          saveNewTabInfoInLocalStorage(tabInfo);
      });
    }
  });
}

function closedWindow() {
  chrome.storage.sync.get(null, (items) => {
    for (var key in items) {
      if (items.hasOwnProperty(key)) {
        var tabDetails = JSON.parse(items[key]);
        saveTabInfo(tabDetails);
      }
    }
  });
}

chrome.tabs.onActivated.addListener(function (activeInfo) {
  var switchedTab = activeInfo.tabId;
  if (activeTabID) {
    changeCurrentlyActiveTab(activeTabID, switchedTab);
  }

  setCurrentTabAsActive(switchedTab);
});

// chrome.storage.sync.clear(() => {

//     console.log("all cleared");
// });
// setInterval(function () {
//     chrome.storage.sync.get(null, (items) => {

//         console.log(items);
//     });
// }, 10000);
