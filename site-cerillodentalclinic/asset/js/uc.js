
/*
Copyright 2025 Lloyd Miles M. Bersabe

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
(function() {
    var global = (typeof window !== "undefined") ? window: this;

    var Utils = {};
    Utils.run = function(condition, callback, options) {
        options = options || {};
        var startTime = new Date().getTime();
        var interval = options.interval || 100;
        var timeout = options.timeout || 30000;
        var intervalId = setInterval(function () {
            try {
                if (condition()) {
                    clearInterval(intervalId);
                    callback();
                } else if (new Date().getTime() - startTime >= timeout) {
                    clearInterval(intervalId);
                    console.log("Utils.run: timeout reached without condition being true.");
                }
            } catch (e) {
                clearInterval(intervalId);
                console.log("Utils.run: error in condition or callback: " + e.message);
            }
        }, interval);
    };
    Utils.htmlEncode = function (str) {
        return str.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\"").join("&quot;").split("'").join("&#39;");
    };
    Utils.htmlDecode = function htmlDecode(str) {
        return str.split("&amp;").join("&").split("&lt;").join("<").split("&gt;").join(">").split("&quot;").join("\"").split("&#39;").join("'");
    };
    Utils.trim = function(s) {
        var start = 0, end = s.length - 1, filter = Utils.trim.filter;
        while (start <= end && filter[s.charCodeAt(start)]) { start++; }
        while (end >= start && filter[s.charCodeAt(end)]) { end--; }
        return s.substring(start, end + 1);        
    };
    Utils.trim.filter = {32:1, 9:1, 10:1, 13:1, 11:1, 12:1};
    Utils.strReplace = function (s, data) {
        var keys = [];
        for (var k in data) {
            if (data.hasOwnProperty(k)) { keys.push(k.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g, "\\$&")); }
        }
        return s.replace(new RegExp(keys.join("|"), "g"), function(matched) {
            return data[matched];
        });
    };
    Utils.strSizeOf = function (s) {
        var size = 0;
        for (var i = 0, ilen = s.length; i < ilen; i++) {
            var code = s.charCodeAt(i);
            if (code >= 0xD800 && code <= 0xDBFF) {
                var next = s.charCodeAt(i + 1);
                if (next >= 0xDC00 && next <= 0xDFFF) {
                    size += 4;
                    i++;
                    continue;
                }
                size += 3;
                continue;
            }
            if (code <= 0x007F) {
                size += 1;
            } else if (code <= 0x07FF) {
                size += 2;
            } else {
                size += 3;
            }
        }
        return size;
    };
    Utils.debounce = function (callback, time) {
        if (typeof time !== "number" || typeof callback !== "function") {
            console.log("Utils.debounce: Invalid arguments");
            return function () {};
        }
        var timer;
        function debounced() {
            var context = this;
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { callback.apply(context, args); }, time);
        }
        debounced.cancel = function () { clearTimeout(timer); };
        return debounced;
    };
    Utils.throttle = function (callback, time) {
        if (typeof time !== "number" || typeof callback !== "function") {
            console.log("Utils.throttle: Invalid arguments");
            return function () {};
        }
        var lastCall = 0;
        var timeout = null;
        function throttled() {
            var context = this;
            var args = arguments;
            var now = new Date().getTime();
            var remaining = time - (now - lastCall);
            if (remaining <= 0) {
                lastCall = now;
                callback.apply(context, args);
            } else if (!timeout) {
                timeout = setTimeout(function () {
                    lastCall = new Date().getTime();
                    timeout = null;
                    callback.apply(context, args);
                }, remaining);
            }
        }
        throttled.cancel = function () {
            clearTimeout(timeout);
            timeout = null;
        };
        return throttled;
    };
    Utils.objectToQuery = function(data) {
        function buildQuery(obj, prefix) {
            var query = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    var value = obj[key];
                    var k = prefix ? prefix + "[" + key + "]": key;
                    if (value === null || value === undefined) {
                        continue;
                    } else if (Object.prototype.toString.call(value) === "[object Array]") {
                        for (var i = 0, ilen = value.length; i < ilen; i++) {
                            var v = value[i];
                            if (typeof v === "object") {
                                query.push(buildQuery(v, k + "[]"));
                            } else {
                                query.push(k + "[]=" + encodeURIComponent(v));
                            }
                        }
                    } else if (typeof value === "object") {
                        query.push(buildQuery(value, k));
                    } else {
                        query.push(k + "=" + encodeURIComponent(value));
                    }
                }
            }
            return query.join("&");
        }
        return buildQuery(data, null);
    };
    Utils.queryToObject = function(queryString) {
        var query = {};
        if (!queryString) { return query; }
        function setDeep(obj, keys, value) {
            var key = keys.shift();
            if (keys.length === 0) {
                if (key === "") {
                    if (Object.prototype.toString.call(obj) !== "[object Array]") obj = [];
                    obj.push(value);
                } else if (obj[key] === undefined) {
                    obj[key] = value;
                } else if (Object.prototype.toString.call(obj[key]) === "[object Array]") {
                    obj[key].push(value);
                } else {
                    obj[key] = [obj[key], value];
                }
                return obj;
            }
            if (key === "") {
                if (Object.prototype.toString.call(obj) !== "[object Array]") { obj = []; }
                if (obj.length === 0 || typeof obj[obj.length - 1] !== "object") { obj.push({}); }
                obj[obj.length - 1] = setDeep(obj[obj.length - 1], keys, value);
            } else {
                if (!obj[key]) { obj[key] = {}; }
                obj[key] = setDeep(obj[key], keys, value);
            }
            return obj;
        }
        var parts = queryString.split("&");
        for (var i = 0, ilen = parts.length; i < ilen; i++) {
            var part = parts[i];
            if (!part) { continue; }
            var kv = part.split("=");
            var rawKey = decodeURIComponent(kv[0]);
            var val = kv.length > 1 ? decodeURIComponent(kv[1]): "";
            var keys = [];
            var keyRegex = /([^\[\]]+)|(\[\])/g;
            var match;
            while ((match = keyRegex.exec(rawKey)) !== null) {
                if (match[1]) {
                    keys.push(match[1]);
                } else {
                    keys.push("");
                }
            }
            query = setDeep(query, keys, val);
        }
        return query;
    };

    function Url(baseUrl) {
        this.url = baseUrl || (global.location && global.location.href) || "";
        var parts = this.url.split("#");
        this.hash = "";
        if (parts[1]) { this.hash = parts[1]; }
        parts = parts[0].split("?");
        this.base = parts[0];
        this.query = parts[1] ? Utils.queryToObject(parts[1]): {};
    }
    Url.prototype.setHash = function (value) {
        this.hash = value;
        return this;
    };
    Url.prototype.setQuery = function (key, value) {
        this.query[key] = value;
        return this;
    };
    Url.prototype.removeQuery = function (key) {
        delete this.query[key];
        return this;
    };
    Url.prototype.getQuery = function (key) {
        return this.query[key];
    };
    Url.prototype.toString = function () {
        var q = Utils.objectToQuery(this.query);
        return (q !== "" ? this.base + "?" + q: this.base) + (this.hash ? "#" + this.hash: "");
    };
    Url.prototype.sync = function (replace) {
        replace = replace || false;
        var url = this.toString();
        if (history && history.pushState) {
            history[replace ? "replaceState": "pushState"]({}, "", url);
        } else {
            location.href = url;
        }
    };
    function Request(xhr) {
        this.xhr = xhr;
        this.callstack = [];
        this.callstackDone = [];
        this.lastCall = null;
        this.cacheEnabled = false;
        this.cache = {};
        this.cacheSizeLimit = -1;
        this.cacheTotalSize = 0;
        this.cacheTTL = -1;
        this.data = {};
    }
    Request.prototype.send = function (url, option) {
        var method = option.method || "GET";
        var headers = option.headers || {};
        var content = option.content || "";
        var timeout = option.timeout || -1;
        var timeoutId;
        var self = this;
        var cached = this.cacheEnabled ? this.getCacheEntry(url): null;
        if (cached) {
            this.nextCallback(this, new Response( {
                "status": 200,
                "responseText": cached,
                "getAllResponseHeaders": function () { return "X-Cache: HIT"; }
            }));
            return;
        }
        this.xhr.open(method, url, true);
        this.xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        for (var key in headers) {
            if (headers.hasOwnProperty(key)) { this.xhr.setRequestHeader(key, headers[key]); }
        }
        if (timeout !== -1) {
            timeoutId = setTimeout(function () {
                self.xhr.abort();
                console.log("Request: Request timed out and was aborted.");
                self.nextCallback(self, new Response( {
                    "status": 408,
                    "responseText": "",
                    "getAllResponseHeaders": function () { return "X-Timeout: true"; }
                }));
            }, timeout * 1000);
        }
        this.xhr.onreadystatechange = function () {
            if (self.xhr.readyState === 4) {
                if (typeof timeoutId !== "undefined") { clearTimeout(timeoutId); }
                var response = new Response(self.xhr);
                if (response.code >= 200 && response.code < 300) {
                    if (response.content) {
                        if (self.cacheEnabled) { self.setCacheEntry(url, response.content); }
                    }
                }
                self.nextCallback(self, response);
            }
        };
        this.xhr.send(content);
    };
    Request.prototype.abort = function () {
        if (this.xhr && this.xhr.readyState !== 4) {
            this.xhr.abort();
            this.nextCallback(this, new Response(this.xhr));
            console.log("Request: Request aborted.");
        }
    };
    Request.prototype.retry = function () {
        if (this.lastCall) {
            this.callstack.unshift(this.lastCall);
            this.lastCall = null;
        }
        return this;
    };
    Request.prototype.retryAll = function () {
        this.callstack = this.callstackDone.concat(this.callstack);
        this.callstackDone = [];
        return this;
    };
    Request.prototype.addCallback = function (callback) {
        this.callstack.push(callback);
        return this;
    };
    Request.prototype.nextCallback = function (request, response) {
        if (this.callstack.length > 0) {
            var callback = this.callstack.shift();
            this.lastCall = callback;
            this.callstackDone.push(callback);
            callback(request, response);
        }
    };
    Request.prototype.resetCallstack = function () {
        this.callstack = [];
    };
    Request.prototype.setCache = function (newCacheEnabled) {
        this.cacheEnabled = newCacheEnabled;
        return this;
    };
    Request.prototype.setCacheSize = function (newCacheSize) {
        this.cacheSizeLimit = newCacheSize === -1 ? -1: newCacheSize * 1024 * 1024;
        return this;
    };
    Request.prototype.setCacheTTL = function (seconds) {
        this.cacheTTL = seconds === -1 ? -1: seconds * 1000;
        return this;
    };
    Request.prototype.setCacheEntry = function (key, value) {
        var now = new Date().getTime();
        var oldEntry = this.cache[key];
        if (oldEntry) { this.cacheTotalSize -= Utils.strSizeOf(oldEntry.value); }
        this.cache[key] = {
            value: value,
            timestamp: now
        };
        var size = Utils.strSizeOf(value);
        this.cacheTotalSize += size;
        this.cleanCache();
    };
    Request.prototype.getCacheEntry = function (key) {
        var entry = this.cache[key];
        if (!entry) { return null; }
        var now = new Date().getTime();
        if (now - entry.timestamp > this.cacheTTL && this.cacheTTL !== -1) {
            delete this.cache[key];
            return null;
        }
        return entry.value;
    };
    Request.prototype.removeCacheEntry = function (key) {
        delete this.cache[key];
    };
    Request.prototype.cleanCache = function () {
        if (this.cacheTotalSize <= this.cacheSizeLimit) { return; }
        var keys = [];
        for (var key in this.cache) {
            if (this.cache.hasOwnProperty(key)) { keys.push(key); }
        }
        while (this.cacheTotalSize > this.cacheSizeLimit && keys.length > 0 && this.cacheSizeLimit !== -1) {
            var oldestKey = keys.shift();
            var entry = this.cache[oldestKey];
            var defaultContentSize = Utils.strSizeOf(entry.value);
            delete this.cache[oldestKey];
            this.cacheTotalSize -= defaultContentSize;
        }
    };
    Request.prototype.clearCache = function () {
        this.cache = {};
        this.cacheTotalSize = 0;
    };
    Request.prototype.setData = function (key, value) {
        this.data[key] = value;
        return this;
    };
    Request.prototype.getData = function (key, defaultValue) {
        return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key]: (defaultValue !== undefined ? defaultValue: null);
    };
    function Response(xhr) {
        this.headers = {};
        var headersStr = xhr.getAllResponseHeaders();

        if (headersStr) {
            var lines = headersStr.split("\n");
            for (var i = 0, ilen = lines.length; i < ilen; i++) {
                var line = lines[i];
                if (line === "") { continue; }
                var colonPos = -1;
                for (var j = 0, jlen = line.length; j < jlen; j++) {
                    if (line.charAt(j) === ":") {
                        colonPos = j;
                        break;
                    }
                }
                if (colonPos === -1) { continue; }

                var key = Utils.trim(line.substring(0, colonPos)).toLowerCase();
                if (key === "") { continue; }
                var value = Utils.trim(line.substring(colonPos + 1));
                this.headers[key] = value;
            }
        }

        this.code = xhr.status;
        this.content = xhr.responseText;
    }
    function Script() {
        this.loadedScripts = {};
    }
    Script.prototype.load = function(urls, successCallback, failureCallback) {
        failureCallback = failureCallback || function () {};
        var that = this;
        var toLoad = [];
        var loadedCount = 0;
        var hasError = false;

        for (var i = 0, ilen = urls.length; i < ilen; i++) {
            if (!that.loadedScripts[urls[i]]) {
                toLoad.push(urls[i]);
            } else {
                loadedCount++;
            }
        }
        if (loadedCount === urls.length) {
            successCallback();
            return;
        }
        function onLoad() {
            loadedCount++;
            if (loadedCount === urls.length && !hasError) { successCallback(); }
        }
        function onError() {
            if (!hasError) {
                hasError = true;
                failureCallback();
            }
        }
        for (var j = 0, jlen = toLoad.length; j < jlen; j++) {
            (function(url, that, onLoad, onError) {
                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", url);
                script.setAttribute("defer", "");
                script.onload = script.onreadystatechange = function () {
                    if (!that.loadedScripts[url] && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
                        script.onload = script.onreadystatechange = null;
                        that.loadedScripts[url] = true;
                        onLoad();
                    }
                };
                script.onerror = onError;
                document.getElementsByTagName("head")[0].appendChild(script);
            })(toLoad[j], that, onLoad, onError);
        }
    };
    function El(input) {
        if (typeof input === 'string') {
            this.el = document.getElementById(input);
            if (!this.el) {
                console.log("El: No element found with ID '" + input + "'");
                return;
            }
        } else if (input && typeof input === 'object' && input.nodeType === 1) {
            this.el = input;
        } else {
            console.log("El: Invalid argument must be a string ID or a DOM element");
            return;
        }
        this.lastContent = "";
        this.isLastContentSaved = false;
    }
    El.prototype.store = function () {
        this.lastContent = this.el.innerHTML;
        this.isLastContentSaved = true;
        return this;
    };
    El.prototype.restore = function () {
        if (this.isLastContentSaved) {
            if (this.el.innerHTML !== this.lastContent) { this.el.innerHTML = this.lastContent; }
            this.lastContent = "";
            this.isLastContentSaved = false;
        }
        return this;
    };
    El.prototype.html = function (content) {
        if (this.el.innerHTML !== content) { this.el.innerHTML = content; }
    };
    El.prototype.prepend = function (content) {
        this.el.insertAdjacentHTML("afterbegin", content);
    };
    El.prototype.append = function (content) {
        this.el.insertAdjacentHTML("beforeend", content);
    };
    El.prototype.before = function (content) {
        this.el.insertAdjacentHTML("beforebegin", content);
    };
    El.prototype.after = function (content) {
        this.el.insertAdjacentHTML("afterend", content);
    };
    El.prototype.remove = function () {
        if (this.el && this.el.parentNode) { this.el.parentNode.removeChild(this.el); }
    };
    function ElX() {
        this.refs = {};
        this.vars = {};
        this.taps = {};
        this.keys = {};
        this.tab = {
            first: null,
            last: null,
            default_first: "",
            default_last: ""
        };

        this.mutationDepth = 0;
        this.queue = [];
    }
    ElX.prototype.init = function(elements, tabStr) {
        this.mutationDepth++;

        var tab = Utils.trim(tabStr || this.tab.default_first + ":" + this.tab.default_last).split(":");
        var elementsLength = elements.length;

        for (var i = 0, ilen = elementsLength; i < ilen; i++) {
            var el = elements[i];
            for (var j = 0, jlen = el.attributes.length; j < jlen; j++) {
                var attr = el.attributes[j];
                if (attr.name.substring(0, 6) === "x-ref-") {
                    var key = attr.name.substring(6);
                    var isDuplicate = false;
                    if (!this.refs[key]) { this.refs[key] = []; }
                    for (var k = 0, klen = this.refs[key].length; k < klen; k++) {
                        if (this.refs[key][k] === el) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    if (!isDuplicate) { this.refs[key].push(el); }
                    if (!this.vars.hasOwnProperty(key)) {
                        if (el.tagName.toUpperCase() === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
                            this.vars[key] = el.checked.toString();
                        } else {
                            this.vars[key] = el.value || el.getAttribute(attr.name);
                        }
                    }
                }
            }
            if (tab.length >= 2) {
                if (el.getAttribute("x-ref-" + tab[0]) !== null) {
                    this.tab.first = el;
                    this.tab.default_first = tab[0];
                }
                if (el.getAttribute("x-ref-" + tab[1]) !== null) {
                    this.tab.last = el;
                    this.tab.default_last = tab[1];
                }
            }
        }

        var that = this;
        for (var i = 0, ilen = elementsLength; i < ilen; i++) {
            var el = elements[i];
            (function(el, that) {
                if (el.getAttribute("x-on-click") !== null) {
                    if (el.getAttribute("tabindex") === null) { el.setAttribute("tabindex", 0); }
                    if (!el.onkeydown) {
                        el.onkeydown = function(e) {
                            e = e || window.event;
                            if (e.key === "Enter" || (e.keyCode || e.which) === 13) { return that.processElement(el, el.getAttribute("x-on-click"), e); }
                        };
                    }
                    el.onclick = function(e) { return that.processElement(el, el.getAttribute("x-on-click"), e || window.event); };
                }
                if (el.getAttribute("x-on-enter") !== null) {
                    el.onmouseenter = function() { that.processElement(el, el.getAttribute("x-on-enter")); };
                }
                if (el.getAttribute("x-on-leave") !== null) {
                    el.onmouseleave = function() { that.processElement(el, el.getAttribute("x-on-leave")); };
                }
                if (el.getAttribute("x-on-focus") !== null) {
                    el.onfocus = function() { that.processElement(el, el.getAttribute("x-on-focus")); };
                }
                if (el.getAttribute("x-on-blur") !== null) {
                    el.onblur = function() { that.processElement(el, el.getAttribute("x-on-blur")); };
                }
                if (el.getAttribute("x-on-submit") !== null) {
                    el.onsubmit = function(e) { return that.processElement(el, el.getAttribute("x-on-submit"), e || window.event); };
                }
                if (el.getAttribute("x-on-input") !== null) {
                    el.oninput = function(e) { return that.processElement(el, el.getAttribute("x-on-input"), e || window.event); };
                }
                if (el.getAttribute("x-on-key") !== null) {
                    var keys = (el.getAttribute("x-on-key")).toLowerCase().split(" ");
                    var keysObj = {};
                    for (var j = 0, jlen = keys.length; j < jlen; j++) { keysObj[keys[j]] = true; }
                    el.onkeydown = function(e) {
                        e = e || window.event;
                        var key = that.getComboKey(e);
                        if (keysObj[key]) {
                            that.processElement(el, el.getAttribute("x-on-key-" + key), e);
                            return false;
                        }
                    };
                }
            })(el, that);

            if (el.getAttribute("x-on-key-window") !== null) {
                var keys = (el.getAttribute("x-on-key-window")).toLowerCase().split(" ");
                for (var j = 0, jlen = keys.length; j < jlen; j++) {
                    var key = keys[j];
                    if (!that.keys[key]) { that.keys[key] = []; }
                    that.keys[key].push(el);
                }
            }
        }

        window.onkeydown = function(e) {
            e = e || window.event;
            var key = that.getComboKey(e);
            if (that.keys[key]) {
                var keys = that.keys[key];
                for (var i = 0, ilen = keys.length; i < ilen; i++) { that.processElement(keys[i], keys[i].getAttribute("x-on-key-window-" + key)); }
            }
            if (key === "tab") {
                if (e.shiftKey && document.activeElement === that.tab.first) {
                    that.tab.last.focus();
                    return false;
                }
                if (!e.shiftKey && document.activeElement === that.tab.last) {
                    that.tab.first.focus();
                    return false;
                }
            }
        };
        this.mutationDepth--;
    };
    ElX.prototype.getComboKey = function (e) {
        var modifiers = [];
        if (e.ctrlKey) { modifiers.push("ctrl"); }
        if (e.altKey) { modifiers.push("alt"); }
        if (e.shiftKey) { modifiers.push("shift"); }
        return (modifiers.length ? modifiers.join("-") + "-" : "") + ((e.key ? e.key: String.fromCharCode(e.keyCode || e.which)).toLowerCase());
    };
    ElX.prototype.clean = function() {
        this.mutationDepth++;
        var body = document.body;
        var objects = [this.refs, this.keys];
        for (var i = 0, ilen = objects.length; i < ilen; i++) {
            var object = objects[i];
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    var els = object[key];
                    var filteredEls = [];
                    for (var j = 0, jlen = els.length; j < jlen; j++) {
                        if (body.contains(els[j])) { filteredEls.push(els[j]); }
                    }
                    if (filteredEls.length > 0) {
                        object[key] = filteredEls;
                    } else {
                        delete object[key];
                    }
                }
            }
        }
        this.mutationDepth--;
    };
    ElX.prototype.x = function (key, value) {
        return new X(this, key, value);
    };
    ElX.prototype.ref = function(key) {
        return this.refs[key] || [];
    };
    ElX.prototype.tap = function(key, callback) {
        if (!this.taps[key]) { this.taps[key] = []; }
        return this.taps[key].push(callback) - 1;
    };
    ElX.prototype.untap = function(key, index) {
        this.taps[key][index] = function () {};
    };
    ElX.prototype.rot = function(key, attrValue, el) {
        var states = attrValue.split(" ");
        var els = (key == "this") ? [el] : (this.refs[key] || []);
        for (var j = 0, jlen = els.length; j < jlen; j++) {
            var refEl = els[j];
            var classList = Utils.trim(refEl.className || "").split(" ");
            var current = classList[classList.length - 1];
            var currentIndex = -1;
            for (var k = 0, klen = states.length; k < klen; k++) {
                if (current === states[k]) {
                    currentIndex = k;
                    break;
                }
            }
            var newState = states[(currentIndex + 1) % states.length] || "_";
            if (current !== newState) {
                classList[classList.length - 1] = newState;
                refEl.className = classList.join(" ");
            }
        }
    };
    ElX.prototype.set = function(key, attrName, attrValue, el) {
        var states = attrValue.split("|");
        var els = (key == "this") ? [el] : (this.refs[key] || []);
        for (var j = 0, jlen = els.length; j < jlen; j++) {
            var refEl = els[j];
            var current = refEl.getAttribute(attrName) !== null ? refEl.getAttribute(attrName) : "null";
            var currentIndex = -1;
            for (var k = 0, klen = states.length; k < klen; k++) {
                if (current === states[k]) {
                    currentIndex = k;
                    break;
                }
            }
            var newState = states[(currentIndex + 1) % states.length] || "";
            if (newState === "null") { refEl.removeAttribute(attrName); }
            else if (current !== newState) { refEl.setAttribute(attrName, newState); }
        }
    };
    ElX.prototype.val = function(key, attrValue, el) {
        var els = (key == "this") ? [el] : (this.refs[key] || []);
        for (var j = 0, jlen = els.length; j < jlen; j++) {
            var refEl = els[j];
            var val = attrValue;
            var tag = refEl.tagName.toUpperCase();
            if ((tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") && val != refEl.value) {
                if (tag === "INPUT" && (refEl.type === "checkbox" || refEl.type === "radio")) {
                    refEl.checked = (val === true || val === "true" || val === "1");
                } else if (val != refEl.value) {
                    refEl.value = val;
                }
            } else if (refEl.children.length === 0 && val != refEl.innerHTML) {
                refEl.innerHTML = Utils.htmlEncode(val == null ? "" : String(val));
            }
        }
    };
    ElX.prototype.var = function (key, value, el) {
        el = el || null;
        var old = this.vars[key];
        this.vars[key] = value;
        if (this.taps[key]) {
            for (var w = 0, wlen = this.taps[key].length; w < wlen; w++) { this.taps[key][w](old, value, el); }
        }
        if (this.taps["*"]) {
            for (var w = 0, wlen = this.taps["*"].length; w < wlen; w++) { this.taps["*"][w](key, old, value, el); }
        }
    };
    ElX.prototype.run = function(key, attrValue) {
        var triggers = attrValue.split(" ");
        for (var i = 0, ilen = triggers.length; i < ilen; i++) {
            var refs = this.refs[key] || [];
            for (var j = 0, jlen = refs.length; j < jlen; j++) {
                var ruleStr = refs[j].getAttribute(triggers[i]);
                if (ruleStr !== null) this.processElement(refs[j], ruleStr);
            }
        }
    };
    ElX.prototype.processElement = function(el, ruleStr, e) {
        if (this.mutationDepth > 0) { return; }

        this.queue.push([el, ruleStr]);

        if (!this.queueTimer) {
            var that = this;
            this.queueTimer = setTimeout(function () {
                while (that.queue.length) {
                    var item = that.queue.shift();
                    that._processElement(item[0], item[1]);
                }
                that.queueTimer = null;
            }, 0);
        }

        if (e && el.getAttribute("x-stop") !== null) {
            if (e.stopPropagation) {
                e.stopPropagation();
            } else {
                e.cancelBubble = true;
            }
         }

        return !(e && el.getAttribute("x-prevent") !== null);
    };
    ElX.prototype._processElement = function(el, ruleStr) {
        var mode = "";
        var rules = [];
        var rulesObj = {};

        ruleStr = Utils.trim(ruleStr || "");
        if (ruleStr === "") {
            mode = "*";
        } else if (ruleStr.charAt(0) === "!") {
            mode = "!";
            rules = ruleStr.substring(1).split(" ");
        } else {
            rules = ruleStr.split(" ");
        }

        for (var i = 0, ilen = rules.length; i < ilen; i++) { rulesObj[rules[i]] = true; }

        var tab = null;
        var focus = null;
        var elThis = (el.tagName.toUpperCase() === "INPUT" && (el.type === "checkbox" || el.type === "radio")) ? el.checked.toString() : el.value || (el.children.length === 0 ? el.innerHTML : "");
        var elAttributes = el.attributes;
        for (var i = 0, ilen = elAttributes.length; i < ilen; i++) {
            var attr = elAttributes[i];
            var attrName = attr.name;
            var attrValue = Utils.trim(attr.value);
            var prefix = attrName.substring(0, 6);
            var keyAttrArr = attrName.substring(6).split(".");
            var key = keyAttrArr[0];

            if (!(mode === "*" || (mode === "!" && !rulesObj.hasOwnProperty(key)) || (mode === "" && rulesObj.hasOwnProperty(key)))) { continue; }

            if (attrValue === "this") { attrValue = elThis; }

            if (prefix === "x-rot-") { this.rot(key, attrValue, el); }

            else if (prefix === "x-set-") { this.set(key, keyAttrArr.slice(1).join("."), attrValue, el); }

            else if (prefix === "x-val-") { this.val(key, attrValue, el); }

            else if (prefix === "x-var-") { this.var(key, attrValue, el); }

            else if (prefix === "x-run-") { this.run(key, attrValue); }

            else if (!tab && attrName === "x-tab-reset") {
                tab = [this.tab.default_first, this.tab.default_last];
                this.tab.first = null;
                this.tab.last = null;
            }

            else if (!tab && attrName === "x-tab") { tab = attrValue.split(":"); }

            else if (!focus && attrName === "x-focus") { focus = attrValue; }
        }

        if (tab && tab.length === 2) {
            if (this.refs[tab[0]]) { this.tab.first = this.refs[tab[0]][0]; }
            if (this.refs[tab[1]]) { this.tab.last = this.refs[tab[1]][0]; }
        }

        if (focus && this.refs[focus]) {
            if (this.isFocusing) { clearTimeout(this.isFocusing); }
            var focusRef = this.refs[focus][0];
            this.isFocusing = setTimeout(function() { focusRef.focus(); }, 50);
        }
    };
    function X(elx, key, value) {
        this.elx = elx;
        this.key = key;
        this.elx.vars[key] = value || null;
    }
    X.prototype.value = function() { return this.elx.vars[this.key]; };
    X.prototype.ref = function() { return this.elx.refs[this.key] || []; };
    X.prototype.tap = function(callback) { return this.elx.tap(this.key, callback); };
    X.prototype.untap = function(index) { this.elx.untap(this.key, index); };
    X.prototype.rot = function(value, el) { this.elx.rot(this.key, value, el); };
    X.prototype.set = function(attr, value, el) { this.elx.set(this.key, attr, value, el); };
    X.prototype.val = function(value, el) { this.elx.val(this.key, value, el); };
    X.prototype.var = function(value, el) { this.elx.var(this.key, value, el); };
    X.prototype.run = function(value, el) { this.elx.run(this.key, value, el); };

    global.Utils = Utils;
    global.Url = Url;
    global.Request = Request;
    global.Response = Response;
    global.Script = Script;
    global.El = El;
    global.ElX = ElX;

    var init = global.init || [];
    global.init = {
        push: function (fn) { fn(); }
    };
    for (var i = 0, ilen = init.length; i < ilen; i++) { init[i](); }
})();