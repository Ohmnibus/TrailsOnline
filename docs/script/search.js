const ENTRY_NOTE = 0;
const ENTRY_TOPIC = 1;
const SIZE_INCIPIT = 64;
const SIZE_INCIPIT_MAX = 128;

onmessage = function (event) {
	// Accessing to the message data sent by the main page
	var entryList = event.data.entryList;
	var currentFilter = event.data.currentFilter.toLowerCase();
	var currentQuest = event.data.currentQuest;

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
			retVal += "<dd>" + getIncipit(entryList[i]) + "</dd>";
		}
		retVal += "</dl>";
	}

	postMessage(retVal);
}

function matchFilter(entry, filter) {
	if (!filter || filter == null || filter.length == 0) return true;

	return entry.body.toLowerCase().indexOf(filter) > 0;
}

function getIncipit(entry) {
	var retVal = entry.body;
	var newLine = retVal.indexOf("\n");
	if (newLine > 0) {
		retVal = retVal.substr(0, newLine);
	}
	if (retVal.length > SIZE_INCIPIT) {
		var spacePos = retVal.indexOf(" ", SIZE_INCIPIT);
		if (spacePos > 0) {
			retVal = retVal.substr(0, spacePos) + "...";
		} else {
			retVal = retVal.substr(0, SIZE_INCIPIT) + "...";
		}
	}
	return retVal; //entry.body.substr(0, 64);
}