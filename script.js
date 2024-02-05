function isWikipediaCite(cite_element) {
    const regex = /https:\/\/[a-zA-Z]*\.wikipedia.org/g;
    cite_text = cite_element.innerText;
    var found = cite_text.match(regex);
    return found !== null;
}


var search_results_div = document.getElementById("search")
var search_results = Array.from(search_results_div.getElementsByClassName("g"));

search_results.slice().reverse().forEach(function (childElement) {
    var cite_element = childElement.querySelector("cite");
    if (cite_element !== null) {
        if (isWikipediaCite(cite_element)) {
            childElement.parentElement.removeChild(childElement);
            search_results_div.insertBefore(childElement, search_results_div.firstChild);
        }
    }
});

