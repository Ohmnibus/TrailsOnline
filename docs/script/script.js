const ENTRY_NOTE = 0;
const ENTRY_TOPIC = 1;

const CLASS_IS_FOCUSED = "is-focused";
const CLASS_HIDE_ON_LARGE = "mdl-layout--large-screen-only";
const CLASS_IS_SMALL_SCREEN = "is-small-screen";
const CLASS_IS_HIDDEN = "is-hidden";
const CLASS_IS_DETAIL = "is-detail";

const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
const InputDataObserver = new MutationObserver(onInputAreaChanged);
//const MainContainerObserver = new MutationObserver(onMainContainerChanged);

//const source = "https://drive.google.com/uc?id=<driveFileId>";
const source = "https://cors-anywhere.herokuapp.com/https://drive.google.com/uc?id=<driveFileId>&export=download";
//const source = "TdO-Shared.tbk";

//Status variables
var mainData;
var questList;
var entryList;

var isLoaded = false;
var currentQuest = -1;
var currentItem = -1;
var currentFilter = null;
var isSmallScreen = false;

//Reference to elements
var driveFileId;
var leftPane;
var rightPane;
var leftPaneContainer;
var rightPaneContainer;
var ddlQuestList;
var inputFilter;
var mainContainer;


document.addEventListener('DOMContentLoaded', function () {
	onLoad();
}, false);

function onLoad() {
	mainContainer = document.getElementById("mainContainer");
	leftPane = document.getElementById("leftPane");
	leftPaneContainer = leftPane.parentElement;
	rightPane = document.getElementById("rightPane");
	rightPaneContainer = rightPane.parentElement;
	ddlQuestList = document.getElementById("ddlQuestList");
	inputFilter = document.getElementById("topFilter");

	var inputArea = document.getElementById("inputArea");
	//Listen to changes in inputArea
	InputDataObserver.observe(inputArea, {
		attributes: true,
		attributeFilter: ['class']
	});

	//MainContainerObserver.observe(mainContainer, {
	//	attributes: true,
	//	attributeFilter: ['class']
	//});

	var mediaMatcher = window.matchMedia("(max-width: 479px)");
	onMediaChanged(mediaMatcher);
	mediaMatcher.addListener(onMediaChanged);

	leftPane.innerHTML = "Loading...";
	rightPane.innerHTML = "";

	driveFileId = getParameterByName("driveFileId");

	load(driveFileId);
}

function onMediaChanged(mediaMatcher) {
	isSmallScreen = mediaMatcher.matches;
	if (isSmallScreen) {
		mainContainer.classList.remove(CLASS_IS_DETAIL);
		currentItem = -1;
	}
}

function onInputAreaChanged() {
	if (inputArea.classList.contains(CLASS_IS_FOCUSED)) {
		ddlQuestList.classList.add(CLASS_HIDE_ON_LARGE);
	} else {
		ddlQuestList.classList.remove(CLASS_HIDE_ON_LARGE);
	}
}

const TEMPLATE_ENTRY_TOPIC = "<div class=\"card-wide mdl-card mdl-shadow--2dp\">" +
			"<div class=\"mdl-card__title\">" +
			"<h2 class=\"mdl-card__title-text\">{entryTitle}</h2>" +
			"</div>" +
			"<div class=\"mdl-card__supporting-text\">" +
			"{entryBody}" +
			"</div>" +
			"<div class=\"mdl-card__actions mdl-card--border\">" +
			"{entryTagList}" + //"<a class=\"mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect\">{entryTagList}</a>" +
			"</div>" +
			"<div class=\"mdl-card__menu\">" +
			"<button class=\"mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect\">" +
			"<i class=\"material-icons\" onclick=\"setFilter('{entryTitle}');\">filter_list</i>" +
			"</button>" +
			"</div>" +
			"</div>";

const TEMPLATE_ENTRY_NOTE = "<div class=\"card-wide mdl-card mdl-shadow--2dp\">" +
			"<div class=\"mdl-card__title\">" +
			"<h2 class=\"mdl-card__title-text\">{entryTitle}</h2>" +
			"</div>" +
			"<div class=\"mdl-card__supporting-text\">" +
			"{entryBody}" +
			"</div>" +
			"<div class=\"mdl-card__actions mdl-card--border\">" +
			"{entryTagList}" +
			"</div>" +
			//"<div class=\"mdl-card__menu\">" +
			//"<button class=\"mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect\">" +
			//"<i class=\"material-icons\" onclick=\"setFilter('{entryTitle}');\">filter_list</i>" +
			//"</button>" +
			//"</div>" +
			"</div>";

const TEMPLATE_ENTRY_CATEGORY = "<a class=\"mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect\">{entryCategory}</a>";
const TEMPLATE_ENTRY_TOKEN = "<a href=\"javascript:setFilter('{entryTopic}');\">{entryTopicBody}</a>";

function showList() {
	currentItem = -1;
	mainContainer.classList.remove(CLASS_IS_DETAIL);
	rightPane.innerHTML = "";
}

function showEntry(index) {
	if (!isLoaded) return;
	var entry = entryList[index];
	var content;
	var title;

	currentItem = index;
	mainContainer.classList.add(CLASS_IS_DETAIL);

	if (entry.type == ENTRY_TOPIC) {
		//rightPane.innerHTML = "<h1><a href=\"javascript:setFilter('" + entry.title + "');\">" + entry.title + "</a></h1>" +
		//	"<h3>" + getTagList(entry) + "</h3>" +
		//	getHtmlBody(entry);
		content = TEMPLATE_ENTRY_TOPIC;
		title = entry.title;
	} else {
		//rightPane.innerHTML = "<h1>" + entry.date + " (" + entry.mission + ")</h1>" +
		//	"<h3>" + getTagList(entry) + "</h3>" +
		//	getHtmlBody(entry);
		content = TEMPLATE_ENTRY_NOTE;
		title = entry.date + " (" + entry.mission + ")";
	}

	content = content.replaceAll("{entryTitle}", title);
	content = content.replaceAll("{entryBody}", getHtmlBody(entry));
	content = content.replaceAll("{entryTagList}", getTagList(entry, ""));

	rightPane.innerHTML = content;
}

function getTagList(entry, separator) {
	var sep = "";
	var retVal = "";
	if (entry && entry.categories) {
		for (i = 0; i < entry.categories.length; i++) {
			retVal += sep + TEMPLATE_ENTRY_CATEGORY.replace("{entryCategory}", entry.categories[i]);
			sep = separator;
		}
	}
	return retVal;
}

//var topicRegex = /\B(\@[a-zA-Z]+\b|\@\".+")(?!;)/gm;
var topicRegex = /\@[0-9a-zA-Z\-\_]+|\@\"[^"\x00-\x1f]+\"?/gm;

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
		var match;
		var matches = [];

		while (match = topicRegex.exec(entry.body)) {
			matches.push(match);
		}

		var lastPos = 0;
		for (var i = 0; i < matches.length; i++) {
			match = matches[i];
			var rawTopic = match[0];
			var fromChar = 1;
			var toChar = rawTopic.length;
			if (rawTopic.startsWith("@\"")) {
				fromChar++;
			}
			if (rawTopic.endsWith("\"")) {
				toChar--;
			}
			var topic = rawTopic.substring(fromChar, toChar);

			retVal += entry.body.substring(lastPos, match.index);
			//retVal += "<a href=\"javascript:setFilter('" + topic + "');\">" + rawTopic + "</a>";
			retVal += TEMPLATE_ENTRY_TOKEN.
				replace("{entryTopic}", topic). //TODO: Escape
				replace("{entryTopicBody}", rawTopic);
			lastPos = match.index + rawTopic.length;
		}
		retVal += entry.body.substring(lastPos);

		////HACK!!!
		//retVal = entry.body;
		//if (entry.topics) {
		//	for (var i = 0; i < entry.topics.length; i++) {
		//		var topic = entry.topics[i];
		//		//retVal = retVal.replaceAll(topic, "<a href=\"javascript:setFilter('@&quot;" + topic + "&quot;');return false;\">" + topic + "</a>");
		//		retVal = retVal.replaceAll(topic, "<a href=\"javascript:setFilter('" + topic + "');\">" + topic + "</a>");
		//	}
		//}
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
	currentFilter = "x"; //HACK per forzare il primo refresh
	setFilter("");

	rightPane.innerHTML = "";
}

function refreshQuestList(selected) {
	for (i = 0; i < ddlQuestList.length; i++) {
		ddlQuestList.remove(i);
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
			ddlQuestList.add(option);
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
	if (currentFilter !== value) {
		if (isSmallScreen) {
			showList();
		}
		currentFilter = value;
		refreshEntryList();
	}
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