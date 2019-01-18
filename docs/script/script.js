const ENTRY_NOTE = 0;
const ENTRY_TOPIC = 1;

var mainData;
var questList;
var entryList;

var isLoaded = false;
//var source = "https://drive.google.com/uc?id=<driveFileId>";
var source = "https://cors-anywhere.herokuapp.com/https://drive.google.com/uc?id=<driveFileId>&export=download";
//var source = "TdO-Shared.tbk";
var driveFileId;
var leftPane;
var rightPane;
var inputFilter;
var currentQuest = -1;
var currentFilter = null;

document.addEventListener('DOMContentLoaded', function () {
	onLoad();
}, false);

function onLoad() {
	leftPane = document.getElementById("leftPane");
	rightPane = document.getElementById("rightPane");
	inputFilter = document.getElementById("filter");

	leftPane.innerHTML = "Loading...";
	rightPane.innerHTML = "";

	driveFileId = getParameterByName("driveFileId");

	load(driveFileId);
}

function showEntry(index) {
	if (!isLoaded) return;
	var entry = entryList[index];

	if (entry.type == ENTRY_TOPIC) {
		rightPane.innerHTML = "<h1>" + entry.title + "</h1>" +
			"<h3>" + getTagList(entry) + "</h3>" +
			getHtmlBody(entry);
	} else {
		rightPane.innerHTML = "<h1>" + entry.date + " (" + entry.mission + ")</h1>" +
			"<h3>" + getTagList(entry) + "</h3>" +
			getHtmlBody(entry);
	}
	//rightPane.innerHTML += "<pre>" + JSON.stringify(entry) + "</pre>";
}

function getTagList(entry) {
	var sep = "";
	var retVal = "";
	if (entry && entry.categories) {
		for (i = 0; i < entry.categories.length; i++) {
			retVal += sep + entry.categories[i];
			sep = ", ";
		}
	}
	return retVal;
}

var topicRegex = /\B(\@[a-zA-Z]+\b|\@\".+")(?!;)/gm;

function getHtmlBody(entry) {
	var retVal = "";
	if (entry && entry.body) {
		retVal = getTokenizedBody(entry);
	}
	return "<p>" + retVal.replaceAll("\n", "</p>\n<p>") + "</p>";
}

function getTokenizedBody(entry) {
	var retVal = "";
	if (entry && entry.body) {
		//var matches;
		//var topics = [];

		//while (matches = topicRegex.exec(entry.body)) {
		//	topics.push(matches[0]);
		//}

		//retVal = entry.body;

		//HACK!!!
		retVal = entry.body;
		if (entry.topics) {
			for (var i = 0; i < entry.topics.length; i++) {
				var topic = entry.topics[i];
				//retVal = retVal.replaceAll(topic, "<a href=\"javascript:setFilter('@&quot;" + topic + "&quot;');return false;\">" + topic + "</a>");
				retVal = retVal.replaceAll(topic, "<a href=\"javascript:setFilter('" + topic + "');\">" + topic + "</a>");
			}
		}
	}
	return retVal;
}

function load(fileId) {
	if (isLoaded) return;
	var url = source.replace("<driveFileId>", fileId);
	load_binary_resource(url);
}

function load_binary_resource(url) {

	var xhr = createCORSRequest('GET', url);

	if (!xhr) return '';

	//Hack per scaricare il binario
	xhr.overrideMimeType('text\/plain; charset=x-user-defined');

	xhr.onload = function () {

		var response = xhr.response;

		var result = pako.ungzip(response, { to: 'string' });

		initData(result);
	};

	xhr.onreadystatechange = function() {
		if (xhr.readyState==4) {
			if (xhr.status==200) {
				leftPane.innerHTML = "Inflating data...";
			} else {
				leftPane.innerHTML = "Cannot load data: " + xhr.status;
			}
		}
	}

	xhr.onerror = function () {
		leftPane.innerHTML = "Cannot load data: " + xhr.status;
	};

	xhr.send();
}

function initData(resultText) {

	mainData = JSON.parse(resultText);

	if (mainData) {
		isLoaded = true;
		questList = mainData.quests;
		entryList = mainData.entries;
	} else {
		isLoaded = false;
		questList = undefined;
		entryList = undefined;
	}

	currentQuest = -1;
	if (questList && questList.length > 0) {
		currentQuest = questList[0].id;
	}
	refreshQuestList(currentQuest);
	//refreshEntryList();
	setFilter("");

	rightPane.innerHTML = "";
}

function refreshQuestList(selected) {
	var select = document.getElementById("ddlQuestList");
	for (i = 0; i < select.length; i++) {
		select.remove(i);
	}
	if (!isLoaded) return;
	if (questList) {
		for (i = 0; i < questList.length; i++) {
			var option = document.createElement("option");
			option.text = questList[i].name;
			option.value = questList[i].id;
			if (questList[i].id == selected) {
				option.selected = true;
			}
			select.add(option);
		}
	}
}

var worker;

function refreshEntryList() {
	if (window.Worker) {
		// Instantiating the Worker
		if (worker) {
			worker.terminate();
			worker = undefined;
		}

		worker = new Worker('./script/search.js');

		worker.onmessage = function (event) {
			leftPane.innerHTML = event.data;
		}
		// Getting ready to handle the message sent back by the worker
		//myHelloWorker.addEventListener("message", function (event) {
		//	document.getElementById('p').textContent = event.data;
		//}, false);

		// Starting the worker by sending a first message (e.g count)
		worker.postMessage({
			entryList: entryList,
			currentQuest: currentQuest,
			currentFilter: currentFilter
		});
	} else {
		leftPane.innerHTML = filterEntryList({
			entryList: entryList,
			currentFilter: currentFilter,
			currentQuest: currentQuest,
		});
	}
}

function filterEntryList(data) {
	// Accessing to the message data sent by the main page
	var entryList = data.entryList;
	var currentFilter = data.currentFilter;
	var currentQuest = data.currentQuest;

	// After doing some processing Posting back the message to the main page
	var retVal = "";
	if (entryList) {
		retVal = "<dl>";
		for (i = entryList.length - 1; i >= 0; i--) {
			var entry = entryList[i];

			//Skip entries of different quest
			if (entry.idQuest != currentQuest) continue;

			if (!matchFilter(entry, currentFilter)) continue;

			if (entry.type == ENTRY_TOPIC) {
				retVal += "<dt><a href=\"javascript:showEntry(" + i + ")\">" + entryList[i].title + "</a></dt>";
			} else {
				retVal += "<dt><a href=\"javascript:showEntry(" + i + ")\">" + entryList[i].date + "</a></dt>";
			}
			retVal += "<dd>" + entryList[i].body.substr(0, 64) + "</dd>";
		}
		retVal += "</dl>";
	}
	return retVal;
}

function filterChanged(value) {
	currentFilter = value;
	refreshEntryList();
}

function setFilter(value) {
	//currentFilter = value;
	//refreshEntryList();
	inputFilter.value = value;
	filterChanged(value);
}

function matchFilter(entry, filter) {
	if (!currentFilter || currentFilter == null || currentFilter.length == 0) return true;

	return entry.body.indexOf(filter) > 0;
}

function createCORSRequest(method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {
		// Check if the XMLHttpRequest object has a "withCredentials" property.
		// "withCredentials" only exists on XMLHTTPRequest2 objects.
		xhr.open(method, url, true);
	} else if (typeof XDomainRequest != "undefined") {
		// Otherwise, check if XDomainRequest.
		// XDomainRequest only exists in IE, and is IE's way of making CORS requests.
		xhr = new XDomainRequest();
		xhr.open(method, url);
	} else {
		// Otherwise, CORS is not supported by the browser.
		xhr = null;
	}
	return xhr;
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

String.prototype.replaceAll = function (search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};