// =============================================================================
// Wikipedia First — Content Script
// Moves the first Wikipedia result to the top of search engine results.
// If no Wikipedia result exists, fetches one from the Wikipedia API and injects it.
// Supports: Google, DuckDuckGo, Qwant
// =============================================================================

var ENGINES = {
  google: {
    hostname: "google",
    containerSelectors: ["#rso", "#search"],
    resultSelectors: [
      "#rso > .MjjYud",
      "#rso > .hlcw0c",
      "#rso > div > .g",
      ".g:not(.g .g)",
    ],
    detectSelectors: ["a[href*='wikipedia.org']", "cite"],
    moveParent: false,
  },
  duckduckgo: {
    hostname: "duckduckgo",
    containerSelectors: [
      "ol.react-results--main",
      "[data-testid='web-results']",
    ],
    resultSelectors: [
      "li[data-layout='organic']",
      "article[data-testid='result']",
      "article",
    ],
    detectSelectors: ["a[href*='wikipedia.org']"],
    moveParent: false,
  },
  qwant: {
    hostname: "qwant",
    containerSelectors: ["[data-testid='sectionWeb']"],
    resultSelectors: ["[data-testid='webResult']"],
    detectSelectors: ["a[href*='wikipedia.org']"],
    moveParent: true,
  },
};

// =============================================================================
// Engine detection
// =============================================================================

function detectEngine() {
  var hostname = window.location.hostname;
  var engines = Object.keys(ENGINES);
  for (var i = 0; i < engines.length; i++) {
    if (hostname.indexOf(ENGINES[engines[i]].hostname) !== -1) {
      return ENGINES[engines[i]];
    }
  }
  return null;
}

// =============================================================================
// Wikipedia detection
// =============================================================================

function isWikipediaLink(element) {
  if (element.href && element.href.indexOf("wikipedia.org") !== -1) {
    return true;
  }
  if (
    element.textContent &&
    element.textContent.indexOf("wikipedia.org") !== -1
  ) {
    return true;
  }
  return false;
}

// =============================================================================
// DOM helpers with fallback selectors
// =============================================================================

function findContainer(selectors) {
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) return el;
  }
  return null;
}

function findResults(selectors) {
  for (var i = 0; i < selectors.length; i++) {
    var results = document.querySelectorAll(selectors[i]);
    if (results.length > 0) return Array.from(results);
  }
  return [];
}

// =============================================================================
// Core: find Wikipedia among results and detect it
// =============================================================================

function findWikipediaResult(results, detectSelectors) {
  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    var detectElements = [];
    for (var j = 0; j < detectSelectors.length; j++) {
      var found = result.querySelectorAll(detectSelectors[j]);
      for (var k = 0; k < found.length; k++) {
        detectElements.push(found[k]);
      }
    }
    for (var d = 0; d < detectElements.length; d++) {
      if (isWikipediaLink(detectElements[d])) {
        return { index: i, element: result };
      }
    }
  }
  return null;
}

// =============================================================================
// Google: handle Knowledge Panel where all results are inside one .MjjYud
// Uses .tF2Cxc as individual result units, moves via their common ancestor
// =============================================================================

function googleDeepMove(wikiResult) {
  // Find individual sub-results via .tF2Cxc inside the same .MjjYud
  var parentMjjYud = wikiResult.closest(".MjjYud");
  if (!parentMjjYud) return false;

  var subResults = Array.from(parentMjjYud.querySelectorAll(".tF2Cxc"));
  if (subResults.length < 2) return false;

  var wikiSub = null;
  for (var i = 0; i < subResults.length; i++) {
    if (
      subResults[i].querySelector("a[href*='wikipedia.org']") ||
      subResults[i].querySelector("cite") &&
        subResults[i].querySelector("cite").textContent.indexOf("wikipedia.org") !== -1
    ) {
      wikiSub = subResults[i];
      break;
    }
  }
  if (!wikiSub || wikiSub === subResults[0]) return false;

  // Find the lowest common ancestor of the first sub-result and the wiki sub-result
  var ancestors1 = [];
  var el = subResults[0];
  while (el && el !== document.body) {
    ancestors1.push(el);
    el = el.parentElement;
  }

  var ancestorsWiki = [];
  el = wikiSub;
  while (el && el !== document.body) {
    ancestorsWiki.push(el);
    el = el.parentElement;
  }

  var commonAncestor = null;
  for (var a = 0; a < ancestors1.length; a++) {
    for (var b = 0; b < ancestorsWiki.length; b++) {
      if (ancestors1[a] === ancestorsWiki[b]) {
        commonAncestor = ancestors1[a];
        break;
      }
    }
    if (commonAncestor) break;
  }
  if (!commonAncestor) return false;

  // Find the direct children of the common ancestor that contain each sub-result
  var wikiMoveable = null;
  var firstMoveable = null;
  var children = Array.from(commonAncestor.children);
  for (var c = 0; c < children.length; c++) {
    if (children[c].contains(wikiSub)) wikiMoveable = children[c];
    if (children[c].contains(subResults[0])) firstMoveable = children[c];
  }

  if (!wikiMoveable || !firstMoveable || wikiMoveable === firstMoveable) return false;

  commonAncestor.insertBefore(wikiMoveable, firstMoveable);
  return true;
}

// =============================================================================
// Core: find Wikipedia result in the DOM and move it to the top
// Returns { done, wikiFound, container, firstResult }
// =============================================================================

function moveWikipediaToTop(engine) {
  var container = findContainer(engine.containerSelectors);
  if (!container) return { done: false };

  var results = findResults(engine.resultSelectors);
  if (results.length === 0) return { done: false };

  var wiki = findWikipediaResult(results, engine.detectSelectors);

  // No Wikipedia result in the DOM — signal fallback needed
  if (!wiki) {
    return {
      done: true,
      wikiFound: false,
      container: container,
      firstResult: results[0],
    };
  }

  // Already first result — but on Google, check if Wikipedia is buried inside
  // a single .MjjYud (Knowledge Panel grouping multiple results)
  if (wiki.element === results[0]) {
    if (engine.hostname === "google") {
      googleDeepMove(wiki.element);
    }
    return { done: true, wikiFound: true };
  }

  // Move Wikipedia to top
  var elementToMove = engine.moveParent
    ? wiki.element.parentElement
    : wiki.element;
  var insertTarget = engine.moveParent
    ? results[0].parentElement
    : results[0];

  elementToMove.parentElement.insertBefore(elementToMove, insertTarget);

  return { done: true, wikiFound: true };
}

// =============================================================================
// Fallback: Wikipedia API injection
// =============================================================================

function getSearchQuery() {
  return new URLSearchParams(window.location.search).get("q") || "";
}

function getWikipediaLang() {
  var lang = (navigator.language || "en").split("-")[0];
  return lang || "en";
}

function fetchWikipediaResult(query, lang) {
  var url =
    "https://" +
    lang +
    ".wikipedia.org/w/api.php?action=opensearch&search=" +
    encodeURIComponent(query) +
    "&limit=1&format=json&origin=*";

  return fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      var titles = data[1];
      var urls = data[3];
      if (titles && titles.length > 0) {
        return { title: titles[0], url: urls[0] };
      }
      return null;
    })
    .catch(function () {
      return null;
    });
}

function createWikipediaElement(title, url, lang) {
  var wrapper = document.createElement("div");
  wrapper.className = "wiki-first-injected";
  wrapper.setAttribute(
    "style",
    "padding: 12px 16px; margin-bottom: 12px; border: 1px solid rgba(147, 130, 218, 0.3); border-radius: 8px; background: rgba(147, 130, 218, 0.05); font-family: -apple-system, system-ui, sans-serif;",
  );

  var header = document.createElement("div");
  header.setAttribute(
    "style",
    "display: flex; align-items: center; gap: 8px; margin-bottom: 6px;",
  );

  var icon = document.createElement("img");
  icon.src = "https://www.wikipedia.org/static/favicon/wikipedia.ico";
  icon.width = 16;
  icon.height = 16;
  icon.setAttribute("style", "border-radius: 2px;");

  var domain = document.createElement("span");
  domain.setAttribute("style", "color: #9aa0a6; font-size: 13px;");
  domain.textContent = lang + ".wikipedia.org";

  header.appendChild(icon);
  header.appendChild(domain);

  var link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "style",
    "color: #8ab4f8; font-size: 18px; text-decoration: none; display: block;",
  );
  link.textContent = title + " — Wikip\u00e9dia";

  link.addEventListener("mouseenter", function () {
    link.style.textDecoration = "underline";
  });
  link.addEventListener("mouseleave", function () {
    link.style.textDecoration = "none";
  });

  wrapper.appendChild(header);
  wrapper.appendChild(link);

  return wrapper;
}

function injectWikipediaResult(engine, container, firstResult, title, url, lang) {
  var element = createWikipediaElement(title, url, lang);

  if (engine.moveParent) {
    // Qwant: wrap in a parent div to match the structure
    var outerWrapper = document.createElement("div");
    outerWrapper.appendChild(element);
    var insertTarget = firstResult.parentElement;
    insertTarget.parentElement.insertBefore(outerWrapper, insertTarget);
  } else {
    firstResult.parentElement.insertBefore(element, firstResult);
  }
}

function fallbackInjectWikipedia(engine, container, firstResult) {
  var query = getSearchQuery();
  if (!query) return;

  var lang = getWikipediaLang();

  fetchWikipediaResult(query, lang).then(function (result) {
    if (!result) return;
    injectWikipediaResult(engine, container, firstResult, result.title, result.url, lang);
  });
}

// =============================================================================
// Entry point
// =============================================================================

function main() {
  var engine = detectEngine();
  if (!engine) return;

  // Try immediately
  var result = moveWikipediaToTop(engine);

  if (result.done) {
    if (!result.wikiFound) {
      fallbackInjectWikipedia(engine, result.container, result.firstResult);
    }
    return;
  }

  // Fallback: observe DOM mutations for dynamically loaded results (SPA)
  var fallbackCalled = false;

  var observer = new MutationObserver(function () {
    var r = moveWikipediaToTop(engine);
    if (r.done) {
      observer.disconnect();
      if (!r.wikiFound && !fallbackCalled) {
        fallbackCalled = true;
        fallbackInjectWikipedia(engine, r.container, r.firstResult);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Safety timeout
  setTimeout(function () {
    observer.disconnect();
  }, 10000);
}

main();
