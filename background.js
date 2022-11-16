// try {
//     importScripts('./indexDBMode.js', './utils.js');
//   } catch (e) {
//     console.error(e);
//   }

//   if( 'function' === typeof importScripts) {
//     importScripts('script2.js');

//  }

// A lookup object containing open notifications.
var openURLPrompts = {};

var activeTabID;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "createAlarmForReminder") {
    var remainder = request.options.remainder,
      name = "remainder_" + request.options.id,
      when = new Date(remainder.dateTime).getTime(),
      options = {};

    if (remainder.isRecurring) {
      if (remainder.frequency == "Weekly") {
        options = {
          when,
          periodInMinutes: 10080,
        };
      } else if (remainder.isRecurring == "Daily") {
        options = {
          when,
          periodInMinutes: 60,
        };
      }
    } else {
      options = {
        when,
      };
    }
    createAlarm(name, options);
  } else if (request.type == "createAlarmForControlRenewal") {
    var cntrlSiteDetails = request.options.controlSiteInstance;
    createAlaramForSiteRenew(cntrlSiteDetails);
  } else if (request.type == "getAllLS") {
    chrome.storage.sync.get(null, function (result) {
      if (result && result.restrictedSitesDeatils) {
        console.log(result.restrictedSitesDeatils);
      }
    });
  } else if (request.type == "clearLS") {
    chrome.storage.sync.clear();
  } else if (request.type == "fetchBrowserHistoryCE") {
    fetchBrowserHistoryCE(sender.tab.id);
  } else if(request.type == "test"){
    
chrome.devtools.network.getHAR(
  function(data){
    console.log(data);
  }
)


chrome.devtools.network.onRequestFinished.addListener(
  function(request) {
    if (request.response.bodySize > 40*1024) {
      chrome.devtools.inspectedWindow.eval(
          'console.log("Large image: " + unescape("' +
          escape(request.request.url) + '"))');
    }
  }
);
  }
});

function createAlarm(name, options) {
  chrome.alarms.create(name, options);
}

function createAlaramForSiteRenew(controlSiteInstance) {
  var name = "CntrlRenew_" + controlSiteInstance.targetUrl,
    today = new Date(),
    nxtRenewDate = new Date(
      today.setDate(today.getDate() + controlSiteInstance.basis)
    );
  createAlarm(name, { when: nxtRenewDate });
}

chrome.runtime.onInstalled.addListener(async () => {
  let url = chrome.runtime.getURL("startpage.html");

  let tab = await chrome.tabs.create({ url });

  console.log(`Created tab ${tab.id}`);
});

function handleHistoryDataSave(data, currentIndex, tabid) {
  let localData = data,
    Currentdata = localData[currentIndex],
    URLDetail = {
      domain: new URL(Currentdata.url).origin,
      fullURL: Currentdata.url,
      activeTime: null,
      noOfVisit: Currentdata.visitCount,
      lastVisited: Currentdata.lastVisitTime,
    };

  add(
    "TrackMeHistoryList",
    "TrackMeHistoryListDB",
    URLDetail,
    false,
    function (result) {
      if (currentIndex < localData.length - 1) {
        console.log("Total: " + localData.length + "Current: " + currentIndex);
        handleHistoryDataSave(localData, currentIndex + 1, tabid);
      } else {
        chrome.tabs.sendMessage(tabid, { message: "History Loaded" });
      }
    }
  );
}

function fetchBrowserHistoryCE(tabsID) {
  chrome.history.search(
    { text: "", startTime: 0, maxResults: 10000 },
    function (data) {
      handleHistoryDataSave(data, 0, tabsID);
    }
  );
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.includes("remainder_")) {
    let remainder_id = parseInt(alarm.name.split("_")[1]);

    getRemainderForAlarm(remainder_id, function (remainder_obj) {
      var targetURL = remainder_obj.targetURL;

      var notificationOptions = {
        type: "basic",
        iconUrl: "./Logo/LogoIcon.png",
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

        getRemainderForAlarm(remainder_id, function (remainder_obj) {
          if (!remainder_obj.isRecurring) {
            del("RemaindME", "RemaindMEDB", remainder_id);
          } else {
            if (remainder_obj.frequency == "Monthly") {
              let name = "remainder_" + remainder_id,
                remainderDate = remainder.dateTime,
                targetMonth = new Date().getMonth() + 1,
                targetDate = new Date(remainderDate).getDate(),
                targetHour = new Date(remainderDate).getHours(),
                targetMinutes = new Date(remainderDate).getMinutes();

              let nextReminderDate = new Date();

              nextReminderDate.setMonth(targetMonth);
              nextReminderDate.setDate(targetDate);
              nextReminderDate.setHours(targetHour);
              nextReminderDate.setMinutes(targetMinutes);

              createAlarm(name, { when: nextReminderDate });
            }
          }
        });
      });
    });
  } else if (alarm.name.includes("CntrlRenew_")) {
    chrome.storage.sync.get("restrictedSitesDeatils", function (result) {
      var allResirectedSites = [],
        targetSiteName = parseInt(alarm.name.split("_")[1]);
      if (Object.keys(result).length && result && result != "") {
        allResirectedSites = JSON.parse(result);

        allResirectedSites.forEach(function (site) {
          if (site.url == targetSiteName) {
            site.activeTime = 0;
            site.startTime = new Date();
            createAlaramForSiteRenew(site);
          }
        });
        chrome.storage.sync.set({
          restrictedSitesDeatils: JSON.stringify(allResirectedSites),
        });
      }
    });
  }
});

function getRemainderForAlarm(remainder_id, callback) {
  get("RemaindME", "RemaindMEDB", remainder_id, function (result) {
    callback(result);
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (
    changeInfo.status == "complete" &&
    tab.status == "complete" &&
    tab.url != "chrome://newtab/"
  ) {
    // If current tab id and updated tab ID are same then, there is possibility of tab url update.
    if (activeTabID == tabId) {
      isTabUpdated(tabId, tab.url, tab);
    } else {
      if (tab.active && activeTabID) {
        changeCurrentlyActiveTab(activeTabID, tabId);
      }

      activeTabID = tabId;

      var url = new URL(tab.url).origin;

      checkIsRestrictedSite(url, function (isrestricted) {
        tab.isrestrictedSite = isrestricted;
        saveNewTabInfoInLocalStorage(tab);
      });
    }
  }
});

function isTabUpdated(tabId, newURL, newTabInfo) {
  chrome.storage.sync.get(tabId.toString(), function (result) {
    if (Object.keys(result).length != 0) {
      // REVISIT
      var tabDetails = JSON.parse(Object.entries(result)[0][1]);
      if (tabDetails.domain != new URL(newURL).origin) {
        tabDetails.activeTime =
          tabDetails.activeTime +
          diff_mins(new Date().getTime(), tabDetails.startTime);

        saveTabInfo(tabDetails);
        chrome.storage.sync.remove(tabId.toString(), function () {});
        saveNewTabInfoInLocalStorage(newTabInfo);
        return true;
      } else return false;
    }
  });
}

function changeCurrentlyActiveTab(activeTabID, switchedTab) {
  var activeTabIDStr = activeTabID.toString();

  // Get the current tab and update its new status.
  chrome.storage.sync.get(activeTabIDStr, function (result) {
    if (Object.keys(result).length != 0) {
      // REVISIT
      var tabDetails = JSON.parse(Object.entries(result)[0][1]);

      if (tabDetails.startTime > 0) {
        tabDetails.activeTime =
          tabDetails.activeTime +
          diff_mins(new Date().getTime(), tabDetails.startTime);
      }
      tabDetails.startTime = 0;
      tabDetails.isActiveTab = false;

      var key = parseInt(Object.entries(result)[0][0]);

      chrome.storage.sync.set(
        { [key]: JSON.stringify(tabDetails) },
        function () {}
      );
      activeTabID = switchedTab;
    } else {
      // Its new tab !!! save the instance to local storage.

      chrome.tabs.get(tabId, function (tabInfo) {
        if (tabInfo.url != "chrome://newtab/") {
          checkIsRestrictedSite(url, function (isrestricted) {
            tabInfo.isrestrictedSite = isrestricted;
            saveNewTabInfoInLocalStorage(tabInfo);
          });
        }
      });
    }
  });
}

function checkIsRestrictedSite(url, callback) {
  var checkURL = new URL(url).origin;

  chrome.storage.sync.get("restrictedSitesDeatils", function (results) {
    if (
      Object.keys(results).length &&
      results &&
      results.restrictedSitesDeatils &&
      results != ""
    ) {
      var restrictedSites = JSON.parse(results.restrictedSitesDeatils);

      restrictedSites.forEach(function (result, index) {
        // REVISIT
        // var urlControl = JSON.parse(Object.entries(result)[0][1]);
        if (result && checkURL.includes(result.targetUrl)) {
          setMoniterRestrictedSite(result, checkURL);
          return callback(true);
        }
      });
      return callback(false);
    } else {
      return callback(false);
    }
  });
}

function setMoniterRestrictedSite(restrictedSite, targetURL) {
  let currentActiveTime = restrictedSite.activeTime,
    restrictedMinutes = restrictedSite.restrictedHour, // * 60
    remainingMinutes = restrictedMinutes - currentActiveTime;

  globalThis[targetURL] = setTimeout(function () {
    setCntrlSiteWatchDog(restrictedSite);
  }, remainingMinutes * 60000);
}

function setCntrlSiteWatchDog(restrictedSite) {
  var notificationOptions = {
    type: "basic",
    iconUrl: "./Logo/LogoIcon.png",
    title: "Track Me Remainder",
    message: "You have crossed your limit on this site!!!",
  };

  chrome.notifications.create(notificationOptions, function (id) {});
}

function saveNewTabInfoInLocalStorage(tabInfo) {
  let URLDetail = {
    domain: new URL(tabInfo.url).origin,
    fullURL: tabInfo.url,
    activeTime: 0,
    noOfVisit: 0,
    lastVisited: new Date().getTime(),
    startTime: new Date().getTime(),
    isActiveTab: tabInfo.active,
    isrestrictedSite: tabInfo.isrestrictedSite,
  };

  var id = tabInfo.id;

  var result = JSON.stringify(URLDetail);

  console.log("ID: " + id + " result: " + result);
  chrome.storage.sync.set({ [id]: result });
}

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.sync.get(tabId.toString(), function (result) {
    var tabDetails = JSON.parse(Object.entries(result)[0][1]);
    if (activeTabID == tabId) {
      tabDetails.activeTime =
        tabDetails.activeTime +
        diff_mins(new Date().getTime(), tabDetails.startTime);
    }

    if (tabDetails.isrestrictedSite) {
      updateSiteRestrictedTime(tabDetails.domain, tabDetails.activeTime);
    }
    saveTabInfo(tabDetails);
    chrome.storage.sync.remove(tabId.toString(), function () {});
  });
});

function updateSiteRestrictedTime(domain, activeTime) {
  clearTimeout(globalThis[domain]);
  chrome.storage.sync.get("restrictedSitesDeatils", function (results) {
    if (
      Object.keys(results).length &&
      results &&
      results.restrictedSitesDeatils &&
      results != ""
    ) {
      var restrictedSites = JSON.parse(results.restrictedSitesDeatils);
      restrictedSites.forEach(function (result, index) {
        // REVISIT
        // var urlControl = JSON.parse(Object.entries(result)[0][1]);
        if (result && domain.includes(result.targetUrl)) {
          result.activeTime = result.activeTime + activeTime;
        }
      });

      chrome.storage.sync.set({
        restrictedSitesDeatils: JSON.stringify(restrictedSites),
      });
    }
  });
}

function saveTabInfo(tabInfo) {
  add(
    "TrackMeHistoryList",
    "TrackMeHistoryListDB",
    tabInfo,
    false,
    function (result) {
      console.log(result);
    }
  );
}

function diff_mins(dt2, dt1) {
  var diff = (dt2 - dt1) / (1000 * 60);
  return Math.abs(diff); //Math.round(diff)
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

  setTimeout(() => {
    setCurrentTabAsActive(switchedTab);
  }, 100);
});

// chrome.storage.sync.clear(() => {

//     console.log("all cleared");
// });
// setInterval(function () {
//     chrome.storage.sync.get(null, (items) => {

//         console.log(items);
//     });
// }, 10000);

// ------------------------- IndexDB methods --------------------

function logerr(err) {
  console.log(err);
}

function connectDB(baseName, storeName, f) {
  // Open (or create) the database
  var request = indexedDB.open(baseName, 1);
  request.onerror = logerr;
  request.onsuccess = function () {
    f(request.result);
  };
  request.onupgradeneeded = function (e) {
    //console.log("running onupgradeneeded");
    var Db = e.currentTarget.result; //var Db = e.target.result;

    //uncomment if we want to start clean
    //if(Db.objectStoreNames.contains(storeName)) Db.deleteObjectStore("note");

    //Create store
    if (!Db.objectStoreNames.contains(storeName)) {
      var store = Db.createObjectStore(storeName, {
        keyPath: "id",
        autoIncrement: true,
      });
      //store.createIndex("NameIndex", ["name.last", "name.first"], { unique: false });
    }
    connectDB(baseName, f);
  };
}

function get(baseName, storeName, id, f) {
  connectDB(baseName, storeName, function (db) {
    var transaction = db
      .transaction([storeName], "readonly")
      .objectStore(storeName)
      .get(id);
    transaction.onerror = logerr;
    transaction.onsuccess = function () {
      f(transaction.result ? transaction.result : -1);
    };
  });
}

function up(obj) {
  //obj with id
  del(obj.id, "up");
  add(obj, "up");
}

function del(baseName, storeName, id, info) {
  info = typeof info !== "undefined" ? false : true;
  connectDB(baseName, storeName, function (db) {
    var transaction = db.transaction([storeName], "readwrite");
    var objectStore = transaction.objectStore(storeName);
    var objectStoreRequest = objectStore.delete(id);
    objectStoreRequest.onerror = logerr;
    objectStoreRequest.onsuccess = function () {
      if (info) console.log("Rows has been deleted: ", id);
    };
  });
}

function add(baseName, storeName, obj, info, callback) {
  info = typeof info !== "undefined" ? false : true;
  connectDB(baseName, storeName, function (db) {
    var transaction = db.transaction([storeName], "readwrite");
    var objectStore = transaction.objectStore(storeName);
    var objectStoreRequest = objectStore.add(obj);
    objectStoreRequest.onerror = logerr;
    objectStoreRequest.onsuccess = function () {
      if (info) {
        console.log("Rows has been added");
      } else {
        console.log("Rows has been updated");
      }
      console.info(objectStoreRequest.result);
      callback(objectStoreRequest.result);
    };
  });
}
