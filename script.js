function isWikipediaElement(element) {
    const regex = /https:\/\/[a-zA-Z]*\.wikipedia.org/g;
    return element.innerText.match(regex) !== null;
}

const GOOGLE_RESULTS_DIV_SELECTOR = "#search";
const GOOGLE_RESULTS_ITEMS_SELECTOR = ".g";
const GOOGLE_RESULTS_SITE_SELECTOR = "cite";
const GOOGLE_WAIT_TIME = 0;

const DUCKDUCKGO_RESULTS_DIV_SELECTOR = ".react-results--main";
const DUCKDUCKGO_RESULTS_ITEMS_SELECTOR = "article";
const DUCKDUCKGO_RESULTS_SITE_SELECTOR = "a";
const DUCKDUCKGO_WAIT_TIME = 1000


var current_page_url = window.location.href;
var results_div_selector = null;
var results_item_selector = null;
var results_site_selector = null;
var wait_time = 0;

if (current_page_url.includes("www.google")) {
    results_div_selector = GOOGLE_RESULTS_DIV_SELECTOR;
    results_item_selector = GOOGLE_RESULTS_ITEMS_SELECTOR;
    results_site_selector = GOOGLE_RESULTS_SITE_SELECTOR;
    wait_time = GOOGLE_WAIT_TIME;
}

if (current_page_url.includes("duckduckgo.com")) {
    results_div_selector = DUCKDUCKGO_RESULTS_DIV_SELECTOR;
    results_item_selector = DUCKDUCKGO_RESULTS_ITEMS_SELECTOR;
    results_site_selector = DUCKDUCKGO_RESULTS_SITE_SELECTOR;
    wait_time = DUCKDUCKGO_WAIT_TIME;
}

setTimeout(function () {
    console.log(results_div_selector);
    var search_results_div = document.querySelector(results_div_selector)
    var search_results = Array.from(search_results_div.querySelectorAll(results_item_selector));
    console.log(search_results_div);
    console.log(search_results);
    search_results.slice().reverse().forEach(function (childElement) {
        var cite_elements = childElement.querySelectorAll(results_site_selector);
        var needs_to_swap = false;

        cite_elements.forEach(function (cite_element) {
            if (isWikipediaElement(cite_element)) {
                needs_to_swap = true;
            }
        })
        if (needs_to_swap) {
            childElement.parentElement.removeChild(childElement);
            search_results_div.insertBefore(childElement, search_results_div.firstChild);
        }
    });
}, wait_time);