// This works on all devices/browsers, and uses IndexedDBShim as a final fallback 
var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB,
    IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction,
    baseName = "TrackME",
    storeName = "TrackMEDB";

function logerr(err) {
    console.log(err);
}

function connectDB(f) {

    // Open (or create) the database
    var request = indexedDB.open(baseName, 1);
    request.onerror = logerr;
    request.onsuccess = function () {
        f(request.result);
    }
    request.onupgradeneeded = function (e) {
        //console.log("running onupgradeneeded");
        var Db = e.currentTarget.result;//var Db = e.target.result;

        //uncomment if we want to start clean
        //if(Db.objectStoreNames.contains(storeName)) Db.deleteObjectStore("note");

        //Create store
        if (!Db.objectStoreNames.contains(storeName)) {
            var store = Db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
            //store.createIndex("NameIndex", ["name.last", "name.first"], { unique: false });
        }
        connectDB(f);
    }
}

function get(id, f) {
    connectDB(function (db) {
        var transaction = db.transaction([storeName], "readonly").objectStore(storeName).get(id);
        transaction.onerror = logerr;
        transaction.onsuccess = function () {
            f(transaction.result ? transaction.result : -1);
        }
    });
}

function getAll(f) {
    connectDB(function (db) {
        var rows = [],
            store = db.transaction([storeName], "readonly").objectStore(storeName);

        if (store.mozGetAll)
            store.mozGetAll().onsuccess = function (e) {
                f(e.target.result);
            };
        else
            store.openCursor().onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor) {
                    rows.push(cursor.value);
                    cursor.continue();
                }
                else {
                    f(rows);
                }
            };
    });
}

function up(obj) {//obj with id
    del(obj.id, 'up');
    add(obj, 'up');
}

function add(obj, info) {
    info = typeof info !== 'undefined' ? false : true;
    connectDB(function (db) {
        var transaction = db.transaction([storeName], "readwrite");
        var objectStore = transaction.objectStore(storeName);
        var objectStoreRequest = objectStore.add(obj);
        objectStoreRequest.onerror = logerr;
        objectStoreRequest.onsuccess = function () {
            if (info) { console.log("Rows has been added"); }
            else { console.log("Rows has been updated"); }
            console.info(objectStoreRequest.result);
        }
    });
}

function del(id, info) {
    info = typeof info !== 'undefined' ? false : true;
    connectDB(function (db) {
        var transaction = db.transaction([storeName], "readwrite");
        var objectStore = transaction.objectStore(storeName);
        var objectStoreRequest = objectStore.delete(id);
        objectStoreRequest.onerror = logerr;
        objectStoreRequest.onsuccess = function () {
            if (info)
                console.log("Rows has been deleted: ", id);
        }
    });
}

// //add data
// add({ word: 'one', data: 100 });
// add({ word: 'two', data: 200 });
// add({ word: 'three', data: 300 });
// add({ word: 'seven', data: 700 });

// //edit data
// up({ word: 'five', data: 500, id: 1 });

// //delete
// del(3);

// //get data
// func = function (result) {
//     console.log(result);
// };
// get(1, func);
// getAll(func);