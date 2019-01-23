const ENTRY_NOTE = 0;
const ENTRY_TOPIC = 1;
const SIZE_INCIPIT = 256;

//const TEMPLATE_ITEM_TOPIC = "<dt><a href=\"javascript:showEntry({entryIndex})\">{entryTitle}</a></dt><dd>{entryIncipit}</dd>";
//const TEMPLATE_ITEM_NOTE = "<dt><a href=\"javascript:showEntry({entryIndex})\">{entryDate}</a></dt><dd>{entryIncipit}</dd>";
//const TEMPLATE_LIST = "<dl>{itemList}</dl>";
const TEMPLATE_LIST = "<ul class=\"mdl-list\">{itemList}</ul>";
const TEMPLATE_ITEM = "<li class=\"mdl-list__item mdl-list__item--three-line\" onclick=\"showEntry({entryIndex})\">" +
	"<span class=\"mdl-list__item-primary-content\">" +
	"<i class=\"material-icons mdl-list__item-icon\" style=\"font-size:40px;\">{entryIcon}</i>" + //"<i class=\"material-icons mdl-list__item-avatar\">{entryIcon}</i>" +
	"<span>{entryTitle}</span>" +
	"<span class=\"mdl-list__item-text-body\">" +
	"{entryIncipit}" +
	"</span>" +
	"</span>" +
	"</li>";

onmessage = function (event) {
	// Accessing to the message data sent by the main page
	var entryList = event.data.entryList;
	var currentFilter = event.data.currentFilter.toLowerCase();
	var currentQuest = event.data.currentQuest;

	// After doing some processing Posting back the message to the main page
	var retVal = "";
	if (entryList) {
		//retVal = "<dl>";
		for (i = entryList.length - 1; i >= 0; i--) {
			var entry = entryList[i];
			var item;
			var icon;
			var title;

			//Skip entries of different quest
			if (entry.idQuest != currentQuest) continue;

			if (!matchFilter(entry, currentFilter)) continue;

			//item = "";
			//if (entry.type == ENTRY_TOPIC) {
			//	item += "<dt><a href=\"javascript:showEntry(" + i + ")\">" + entryList[i].title + "</a></dt>";
			//} else {
			//	item += "<dt><a href=\"javascript:showEntry(" + i + ")\">" + entryList[i].date + "</a></dt>";
			//}
			//item += "<dd>" + getIncipit(entryList[i]) + "</dd>";
			if (entry.type == ENTRY_TOPIC) {
				//item = TEMPLATE_ITEM_TOPIC;
				icon = "info";
				title = entry.title;
			} else {
				//item = TEMPLATE_ITEM_NOTE;
				icon = "insert_drive_file";
				title = entry.date;
			}

			item = TEMPLATE_ITEM;
			item = item.replace("{entryIcon}", icon);
			item = item.replace("{entryIndex}", i.toString());
			//item = item.replace("{entryTitle}", entry.title);
			//item = item.replace("{entryDate}", entry.date);
			item = item.replace("{entryTitle}", title);
			item = item.replace("{entryIncipit}", getIncipit(entry));

			if (entry.type == ENTRY_TOPIC && entry.title.toLowerCase() == currentFilter) {
				retVal = item + retVal;
			} else {
				retVal += item;
			}
		}
		retVal = TEMPLATE_LIST.replace("{itemList}", retVal);
	}

	postMessage(retVal);
}

function matchFilter(entry, filter) {
	if (!filter || filter == null || filter.length == 0) return true;

	return (entry.type == ENTRY_TOPIC && entry.title.toLowerCase() == filter)
		|| entry.body.toLowerCase().indexOf(filter) > 0;
}

function getIncipit(entry) {
	var retVal = entry.body;
	//var newLine = retVal.indexOf("\n");
	//if (newLine > 0) {
	//	retVal = retVal.substr(0, newLine);
	//}
	//if (retVal.length > SIZE_INCIPIT) {
	//	var spacePos = retVal.indexOf(" ", SIZE_INCIPIT);
	//	if (spacePos > 0) {
	//		retVal = retVal.substr(0, spacePos) + "...";
	//	} else {
	//		retVal = retVal.substr(0, SIZE_INCIPIT) + "...";
	//	}
	//}
	var newLine = retVal.indexOf("\n");
	if (newLine >= 0) {
		newLine = retVal.indexOf("\n", newLine);
	}
	if (newLine > 0) {
		retVal = retVal.substr(0, newLine + 1);
		retVal = retVal.replace("\n", "<br/>\n");
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