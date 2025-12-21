
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
    var window = (typeof window !== "undefined") ? window : this;

    function Utils() {}
    Utils.run = function(condition, callback, options) {
        options = options || {};
        var startTime = new Date().getTime();
        var interval = options.interval || 100;
        var timeout = options.timeout || 30000;
        var intervalId = setInterval(function () {
            if (condition()) {
                clearInterval(intervalId);
                callback();
            } else if (new Date().getTime() - startTime >= timeout) {
                clearInterval(intervalId);
                console.log("Utils.run: timeout reached without condition being true.");
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
    Utils.script = function(urls, successCallback, failureCallback) {
        failureCallback = failureCallback || function () {};
        var index = 0;
        var urlsLength = urls.length;
        var error = false;

        function loadNext() {
            if (index >= urlsLength) { return successCallback(); }
            var rawUrl = urls[index++];
            var async = (rawUrl.substring(0, 7) == "async::");
            var url = (async ? rawUrl.substring(7) : rawUrl);

            if (Utils.script.loadedScripts[url]) { return loadNext(); }

            var script = window.document.createElement("script");
            script.type = "text/javascript";
            script.src = url;
            script.onload = script.onreadystatechange = function() {
                if (!Utils.script.loadedScripts[url] && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                    Utils.script.loadedScripts[url] = true;
                    script.onload = script.onreadystatechange = null;
                    if (!async && !error) { loadNext(); }
                }
            };
            script.onerror = function() {
                if (!error) {
                    failureCallback(url, function () {
                        Utils.script(urls, successCallback, failureCallback);
                    });
                }
                error = true;
            };
            window.document.getElementsByTagName("head")[0].appendChild(script);
            if (async && !error) { loadNext(); }
        }
        loadNext();
    };
    Utils.script.loadedScripts = {};

    function Url(baseUrl) {
        this.url = baseUrl || (window.location && window.location.href) || "";
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
        var url = this.toString();
        if (history && history.pushState) {
            history[replace || false ? "replaceState": "pushState"]({}, "", url);
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
        var header = option.header || {};
        var content = option.content || "";
        var timeout = option.timeout || -1;
        var timeoutId;
        var self = this;
        var cached = this.cacheEnabled ? this.getCacheEntry(url): null;
        if (cached) {
            this.nextCallback(this, new Response({
                "status": 200,
                "responseText": cached,
                "getAllResponseHeaders": function () { return "X-Cache: HIT"; }
            }));
            return;
        }
        this.xhr.open(method, url, true);
        this.xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        for (var key in header) {
            if (header.hasOwnProperty(key)) { this.xhr.setRequestHeader(key, header[key]); }
        }
        if (timeout !== -1) {
            timeoutId = setTimeout(function () {
                self.xhr.abort();
                console.log("Request: Request timed out and was aborted.");
                self.nextCallback(self, new Response({
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
        return this.data[key] || (defaultValue !== undefined ? defaultValue : null);
    };
    function Response(xhr) {
        this.header = {};
        var headerStr = xhr.getAllResponseHeaders();

        if (headerStr) {
            var lines = headerStr.split("\n");
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
                this.header[key] = value;
            }
        }

        this.code = xhr.status;
        this.content = xhr.responseText;
    }
    function El(input) {
        if (typeof input === 'string') {
            this.el = window.document.getElementById(input);
        } else if (typeof input === 'object' && input.nodeType === 1) {
            this.el = input;
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
    El.prototype.contains = function(child) {
        while (child && child !== this.el) { child = child.parentNode; }
        return child === this.el;
    };
    function ElX() {}
    ElX.refs = {};
    ElX.vars = {};
    ElX.taps = {};
    ElX.keys = {};
    ElX.tab = {
        first: null,
        last: null,
        default_first: "",
        default_last: ""
    };
    ElX.mutationDepth = 0;
    ElX.queue = [];
    ElX.init = function(elements, tabStr) {
        ElX.mutationDepth++;

        var tab = Utils.trim(tabStr || ElX.tab.default_first + ":" + ElX.tab.default_last).split(":");

        for (var i = 0, ilen = elements.length; i < ilen; i++) {
            var el = elements[i];
            for (var j = 0, jlen = el.attributes.length; j < jlen; j++) {
                var attr = el.attributes[j];
                var prefix = attr.name.substring(0, 6);
                var key = attr.name.substring(6);
                if (prefix === "x-ref-") {
                    if (!ElX.refs[key]) { ElX.refs[key] = []; }
                    var isDuplicate = false;
                    for (var k = 0, klen = ElX.refs[key].length; k < klen; k++) {
                        if (ElX.refs[key][k] === el) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    if (!isDuplicate) { ElX.refs[key].push(el); }
                } else if (prefix === "x-var-" && !ElX.vars[key]) { ElX.vars[key] = attr.value !== "this" ? attr.value : (el.tagName.toUpperCase() === "INPUT" && (el.type === "checkbox" || el.type === "radio")) ? el.checked.toString() : el.value || (el.children.length === 0 ? el.innerHTML : ""); }
            }
            if (tab.length >= 2) {
                if (el.getAttribute("x-ref-" + tab[0]) !== null) {
                    ElX.tab.first = el;
                    ElX.tab.default_first = tab[0];
                }
                if (el.getAttribute("x-ref-" + tab[1]) !== null) {
                    ElX.tab.last = el;
                    ElX.tab.default_last = tab[1];
                }
            }

            if (el.getAttribute("x-on-click") !== null) {
                if (el.getAttribute("tabindex") === null) { el.setAttribute("tabindex", 0); }
                if (el.getAttribute("x-on-key") === null) {
                    el.setAttribute("x-on-key", "enter");
                    el.setAttribute("x-on-key-enter", el.getAttribute("x-on-click"));
                }
                el.onclick = ElX.onclick;
            }
            if (el.getAttribute("x-on-enter") !== null) { el.onmouseenter = ElX.onenter; }
            if (el.getAttribute("x-on-leave") !== null) { el.onmouseleave = ElX.onleave; }
            if (el.getAttribute("x-on-focus") !== null) { el.onfocus = ElX.onfocus; }
            if (el.getAttribute("x-on-blur") !== null) { el.onblur = ElX.onblur; }
            if (el.getAttribute("x-on-submit") !== null) { el.onsubmit = ElX.onsubmit; }
            if (el.getAttribute("x-on-input") !== null) { el.oninput = ElX.oninput; }
            if (el.getAttribute("x-on-key") !== null) { el.onkeydown = ElX.onkey; }
            if (el.getAttribute("x-on-key-window") !== null) {
                var keys = el.getAttribute("x-on-key-window").toLowerCase().split(" ");
                for (var j = 0, jlen = keys.length; j < jlen; j++) {
                    var key = keys[j];
                    if (!ElX.keys[key]) { ElX.keys[key] = []; }
                    ElX.keys[key].push(el);
                }
            }
        }

        window.onkeydown = ElX.onkeywindow;

        ElX.mutationDepth--;
    };
    ElX.getComboKey = function (e) {
        var modifiers = [];
        if (e.ctrlKey) { modifiers.push("ctrl"); }
        if (e.altKey) { modifiers.push("alt"); }
        if (e.shiftKey) { modifiers.push("shift"); }
        return (modifiers.length ? modifiers.join("-") + "-" : "") + ((e.key ? e.key: String.fromCharCode(e.keyCode || e.which)).toLowerCase());
    };
    ElX.clean = function(input) {
        ElX.mutationDepth++;
        var body = new El(input || window.document.getElementsByTagName('body')[0]);
        for (var i = 0, object = ElX.refs; i < 2; i++, object = ElX.keys) {
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    var els = object[key];
                    var writeIndex = 0;
                    for (var readIndex = 0; readIndex < els.length; readIndex++) {
                        if (body.contains(els[readIndex])) {
                            els[writeIndex] = els[readIndex];
                            writeIndex++;
                        }
                    }
                    els.length = writeIndex;
                    if (writeIndex === 0) { delete object[key]; }
                }
            }
        }
        ElX.mutationDepth--;
    };
    ElX.x = function (key, value) {
        return new X(ElX, key, value);
    };
    ElX.ref = function(key) {
        return ElX.refs[key] || [];
    };
    ElX.tap = function(key, callback, context) {
        if (!ElX.taps[key]) { ElX.taps[key] = []; }
        return ElX.taps[key].push([callback, context]) - 1;
    };
    ElX.untap = function(key, index) {
        ElX.taps[key][index] = null;
    };
    ElX.rot = function(key, value, el) {
        var states = value.split(" ", 2);
        if (states[1] === undefined) { states[1] = states[0]; }
        var els = (key == "this") ? [el] : (ElX.refs[key] || []);
        for (var i = 0, ilen = els.length; i < ilen; i++) {
            var refEl = els[i];
            var classList = Utils.trim(refEl.className).split(" ");
            var current = classList[classList.length - 1];
            var newState = states[current === states[0] ? 1 : 0] || "_";
            if (current !== newState) {
                classList[classList.length - 1] = newState;
                refEl.className = classList.join(" ");
            }
        }
    };
    ElX.set = function(key, attr, value, el) {
        var states = value.split("|", 2);
        if (states[1] === undefined) { states[1] = states[0]; }
        var els = (key == "this") ? [el] : (ElX.refs[key] || []);
        for (var i = 0, ilen = els.length; i < ilen; i++) {
            var refEl = els[i];
            var current = refEl.getAttribute(attr);
            current = current !== null ? current : "null";
            var newState = states[current === states[0] ? 1 : 0] || "";
            if (current !== newState && newState !== "null") { refEl.setAttribute(attr, newState); }
            else if (current !== "null" && newState === "null") { refEl.removeAttribute(attr); }
        }
    };
    ElX.val = function(key, value, el) {
        var els = (key == "this") ? [el] : (ElX.refs[key] || []);
        for (var i = 0, ilen = els.length; i < ilen; i++) {
            var refEl = els[i];
            var tag = refEl.tagName.toUpperCase();
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                if (tag === "INPUT" && (refEl.type === "checkbox" || refEl.type === "radio")) {
                    value = (value === true || value === "true" || value === "1");
                    if (value != refEl.checked) { refEl.checked = value; }
                } else if (value != refEl.value) {
                    refEl.value = value;
                }
            } else if (refEl.children.length === 0 && value != refEl.innerHTML) {
                refEl.innerHTML = Utils.htmlEncode(String(value));
            }
        }
    };
    ElX.var = function (key, value, event) {
        var old = ElX.vars[key];
        ElX.vars[key] = value;
        for (var i = 0, keyTemp = key; i < 2; i++, keyTemp = "*") {
            if (ElX.taps[keyTemp]) {
                for (var j = 0, jlen = ElX.taps[keyTemp].length; j < jlen; j++) {
                    var tap = ElX.taps[keyTemp][j];
                    if (tap) { tap[0].call(tap[1], old, value, event, key); }
                }
            }
        }
    };
    ElX.run = function(key, triggersStr) {
        var triggers = triggersStr.split(" ");
        for (var i = 0, ilen = triggers.length; i < ilen; i++) {
            var refs = ElX.refs[key] || [];
            for (var j = 0, jlen = refs.length; j < jlen; j++) { ElX.queueEvent(triggers[i], refs[j]); }
        }
    };
    ElX.queueEvent = function(type, target, e) {
        if (ElX.mutationDepth < 1 && !(e && e.stop)) {
            if (e && target.getAttribute("x-stop") !== null) { e.stop = true; }

            ElX.queue.push({type: type, target: target});

            if (!ElX.queueTimer) {
                ElX.queueTimer = setTimeout(function () {
                    while (ElX.queue.length) { ElX.processEvent(ElX.queue.shift()); }
                    ElX.queueTimer = null;
                }, 0);
            }
        }

        return target.getAttribute("x-prevent") === null;
    };
    ElX.processEvent = function(event) {
        var el = event.target;
        var mode = "";
        var rules = [];
        var rulesObj = {};

        var ruleStr = Utils.trim(el.getAttribute(event.type) || "");
        if (ruleStr === "") {
            mode = "*";
        } else if (ruleStr.charAt(0) === "!") {
            mode = "!";
            rules = ruleStr.substring(1).split(" ");
        } else {
            rules = ruleStr.split(" ");
        }

        for (var i = 0, ilen = rules.length; i < ilen; i++) { rulesObj[rules[i]] = true; }

        ElX.elThis = null;
        var tab = null;
        var focus = null;
        var elAttributes = el.attributes;
        for (var i = 0, ilen = elAttributes.length; i < ilen; i++) {
            var attr = elAttributes[i];
            var attrName = attr.name;
            var attrValue = Utils.trim(attr.value);
            var attrNameArr = attrName.split("-");
            var prefix = attrNameArr[0] + "-" + (attrNameArr[1] || "");
            var keyAttrArr = attrNameArr.slice(2).join("-").split(".");
            var key = keyAttrArr[0];

            if (!(mode === "*" || (mode === "!" && !(rulesObj[key] || rulesObj[attrName])) || (mode === "" && (rulesObj[key] || rulesObj[attrName])))) { continue; }

            if (attrValue === "this") {
                if (!ElX.elThis) { ElX.elThis = (el.tagName.toUpperCase() === "INPUT" && (el.type === "checkbox" || el.type === "radio")) ? el.checked.toString() : el.value || (el.children.length === 0 ? el.innerHTML : ""); }
                attrValue = ElX.elThis;
            }

            if (prefix === "x-rot") { ElX.rot(key, attrValue, el); }

            else if (prefix === "x-set") { ElX.set(key, keyAttrArr.slice(1).join("."), attrValue, el); }

            else if (prefix === "x-val") { ElX.val(key, attrValue, el); }

            else if (prefix === "x-var") { ElX.var(key, attrValue, event); }

            else if (prefix === "x-run") { ElX.run(key, attrValue); }

            else if (!tab && prefix === "x-tab") {
                tab = attrValue.split(":");
                if (tab.length !== 2) { tab = [ElX.tab.default_first, ElX.tab.default_last]; }
                ElX.tab.first = null;
                ElX.tab.last = null;
            }

            else if (!focus && prefix === "x-focus") { focus = attrValue; }
        }

        if (tab) {
            if (ElX.refs[tab[0]]) { ElX.tab.first = ElX.refs[tab[0]][0]; }
            if (ElX.refs[tab[1]]) { ElX.tab.last = ElX.refs[tab[1]][0]; }
        }

        if (focus && ElX.refs[focus]) {
            if (ElX.isFocusing) { clearTimeout(ElX.isFocusing); }
            var focusRef = ElX.refs[focus][0];
            ElX.isFocusing = setTimeout(function() { focusRef.focus(); }, 50);
        }
    };
    ElX.onclick = function (e) { return ElX.queueEvent("x-on-click", this, e || window.event); };
    ElX.onenter = function (e) { ElX.queueEvent("x-on-enter", this); };
    ElX.onleave = function (e) { ElX.queueEvent("x-on-leave", this); };
    ElX.onfocus = function (e) { ElX.queueEvent("x-on-focus", this); };
    ElX.onblur = function (e) { ElX.queueEvent("x-on-blur", this); };
    ElX.onsubmit = function (e) { return ElX.queueEvent("x-on-submit", this, e || window.event); };
    ElX.oninput = function (e) { return ElX.queueEvent("x-on-input", this, e || window.event); };
    ElX.onkey = function (e) {
        e = e || window.event;
        var key = ElX.getComboKey(e);
        var keys = (this.getAttribute("x-on-key") || "").toLowerCase().split(" ");
        for (var i = 0, ilen = keys.length; i < ilen; i++) {
            if (key == keys[i]) {
                return ElX.queueEvent("x-on-key-" + key, this, e);
            }
        }
    };
    ElX.onkeywindow = function(e) {
        e = e || window.event;
        var key = ElX.getComboKey(e);
        if (ElX.keys[key]) {
            var els = ElX.keys[key];
            for (var i = 0, ilen = els.length; i < ilen; i++) {
                ElX.queueEvent("x-on-key-window-" + key, els[i], e);
            }
        }
        if (key === "tab") {
            if (e.shiftKey && window.document.activeElement === ElX.tab.first) {
                ElX.tab.last.focus();
                return false;
            }
            if (!e.shiftKey && window.document.activeElement === ElX.tab.last) {
                ElX.tab.first.focus();
                return false;
            }
        }
    };
    function X(elx, key, value) {
        this.elx = elx;
        this.key = key;
        this.elx.vars[key] = value;
    }
    X.prototype.value = function() { return this.elx.vars[this.key]; };
    X.prototype.ref = function() { return this.elx.refs[this.key] || []; };
    X.prototype.tap = function(callback, context) { return this.elx.tap(this.key, callback, context); };
    X.prototype.untap = function(index) { this.elx.untap(this.key, index); };
    X.prototype.rot = function(value) { this.elx.rot(this.key, value); };
    X.prototype.set = function(attr, value) { this.elx.set(this.key, attr, value); };
    X.prototype.val = function(value) { this.elx.val(this.key, value); };
    X.prototype.var = function(value, event) { this.elx.var(this.key, value, event); };
    X.prototype.run = function(triggersStr) { this.elx.run(this.key, triggersStr); };

    window.Utils = Utils;
    window.Url = Url;
    window.Request = Request;
    window.Response = Response;
    window.El = El;
    window.ElX = ElX;

    var init = window.init || [];
    window.init = {
        push: function (fn) { fn(); }
    };
    for (var i = 0, ilen = init.length; i < ilen; i++) { init[i](); }
})();