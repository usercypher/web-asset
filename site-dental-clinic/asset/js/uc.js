
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
    var global = (typeof window !== 'undefined') ? window: this;

    var Utils = {
        trim: function (s) {
            var start = 0, end = s.length - 1;
            while (start <= end && (s.charAt(start) === ' ' || s.charAt(start) === '\t')) start++;
            while (end >= start && (s.charAt(end) === ' ' || s.charAt(end) === '\t')) end--;
            return s.substring(start, end + 1);
        },
        strReplace: function (s, data) {
            var keys = [];
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    keys.push(k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                }
            }
            return s.replace(new RegExp(keys.join('|'), 'g'), function(matched) {
                return data[matched];
            });
        },
        strSizeOf: function (s) {
            var size = 0;
            for (var i = 0; i < s.length; i++) {
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
        },
        debounce: function (callback, time) {
            if (typeof time !== 'number' || typeof callback !== 'function') {
                console.error('Utils.debounce: Invalid arguments');
                return function () {};
            }
            var timer;
            function debounced() {
                var context = this;
                var args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    callback.apply(context, args);
                }, time);
            }
            debounced.cancel = function () {
                clearTimeout(timer);
            };
            return debounced;
        },
        throttle: function (callback, time) {
            if (typeof time !== 'number' || typeof callback !== 'function') {
                console.error('Utils.throttle: Invalid arguments');
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
        },
        objectToQuery: function(data) {
            function buildQuery(obj, prefix) {
                var query = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        var value = obj[key];
                        var k = prefix ? prefix + '[' + key + ']': key;
                        if (value === null || value === undefined) {
                            continue;
                        } else if (Object.prototype.toString.call(value) === '[object Array]') {
                            for (var i = 0; i < value.length; i++) {
                                var v = value[i];
                                if (typeof v === 'object') {
                                    query.push(buildQuery(v, k + '[]'));
                                } else {
                                    query.push(k + '[]=' + encodeURIComponent(v));
                                }
                            }
                        } else if (typeof value === 'object') {
                            query.push(buildQuery(value, k));
                        } else {
                            query.push(k + '=' + encodeURIComponent(value));
                        }
                    }
                }
                return query.join('&');
            }
            return buildQuery(data, null);
        },
        queryToObject: function(queryString) {
            var query = {};
            if (!queryString) return query;
            function setDeep(obj, keys, value) {
                var key = keys.shift();
                if (keys.length === 0) {
                    if (key === '') {
                        if (Object.prototype.toString.call(obj) !== '[object Array]') obj = [];
                        obj.push(value);
                    } else if (obj[key] === undefined) {
                        obj[key] = value;
                    } else if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
                        obj[key].push(value);
                    } else {
                        obj[key] = [obj[key],
                            value];
                    }
                    return obj;
                }
                if (key === '') {
                    if (Object.prototype.toString.call(obj) !== '[object Array]') obj = [];
                    if (obj.length === 0 || typeof obj[obj.length - 1] !== 'object') obj.push({});
                    obj[obj.length - 1] = setDeep(obj[obj.length - 1], keys, value);
                } else {
                    if (!obj[key]) obj[key] = {};
                    obj[key] = setDeep(obj[key], keys, value);
                }
                return obj;
            }
            var parts = queryString.split('&');
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (!part) continue;
                var kv = part.split('=');
                var rawKey = decodeURIComponent(kv[0]);
                var val = kv.length > 1 ? decodeURIComponent(kv[1]): '';
                var keys = [];
                var keyRegex = /([^\[\]]+)|(\[\])/g;
                var match;
                while ((match = keyRegex.exec(rawKey)) !== null) {
                    if (match[1]) keys.push(match[1]);
                    else keys.push('');
                }
                query = setDeep(query, keys, val);
            }
            return query;
        },
    };
    function Url(baseUrl) {
        this.url = baseUrl || (global.location && global.location.href) || '';
        var parts = this.url.split('#');
        this.hash = '';
        if (parts[1]) {
            this.hash = parts[1];
        }
        parts = parts[0].split('?');
        this.base = parts[0];
        this.query = parts[1] ? Utils.queryToObject(parts[1]): {};
    }
    Url.prototype.setHash = function (value) {
        this.hash = value;
        return this;
    };
    Url.prototype.getHash = function () {
        return this.hash;
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
    Url.prototype.getAllQuery = function () {
        return this.query;
    };
    Url.prototype.toString = function () {
        var q = Utils.objectToQuery(this.query);
        return (q !== '' ? this.base + '?' + q: this.base) + (this.hash ? '#' + this.hash: '');
    };
    Url.prototype.sync = function (replace) {
        replace = replace || false;
        var url = this.toString();
        if (history && history.pushState) {
            history[replace ? 'replaceState': 'pushState']({}, '', url);
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
        var method = option.method || 'GET';
        var headers = option.headers || {};
        var content = option.content || '';
        var timeout = option.timeout || -1;
        var timeoutId;
        var self = this;
        var cached = this.cacheEnabled ? this.getCacheEntry(url): null;
        if (cached) {
            this.nextCallback(this, new Response( {
                'status': 200,
                'responseText': cached,
                'getAllResponseHeaders': function () {
                    return 'X-Cache: HIT';
                }
            }));
            return;
        }
        this.xhr.open(method, url, true);
        this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        for (var key in headers) {
            if (headers.hasOwnProperty(key)) {
                this.xhr.setRequestHeader(key, headers[key]);
            }
        }
        if (timeout !== -1) {
            timeoutId = setTimeout(function () {
                self.xhr.abort();
                console.error('Request Error: Request timed out and was aborted.');
                self.nextCallback(self, new Response( {
                    'status': 408,
                    'responseText': '',
                    'getAllResponseHeaders': function () {
                        return 'X-Timeout: true';
                    }
                }));
            }, timeout * 1000);
        }
        this.xhr.onreadystatechange = function () {
            if (self.xhr.readyState === 4) {
                if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
                var response = new Response(self.xhr);
                if (response.code >= 200 && response.code < 300) {
                    if (response.content) {
                        if (self.cacheEnabled) {
                            self.setCacheEntry(url, response.content);
                        }
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
            console.error('Request Error: Request aborted.');
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
        if (oldEntry) {
            this.cacheTotalSize -= Utils.strSizeOf(oldEntry.value);
        }
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
        if (!entry) {
            return null;
        }
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
        if (this.cacheTotalSize <= this.cacheSizeLimit) {
            return;
        }
        var keys = [];
        for (var key in this.cache) {
            if (this.cache.hasOwnProperty(key)) {
                keys.push(key);
            }
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
        var headerStr = xhr.getAllResponseHeaders();

        if (headerStr) {
            var headerPairs = headerStr.split(/\r?\n/);
            for (var i = 0; i < headerPairs.length; i++) {
                var line = headerPairs[i];
                if (line === '') continue;
                var colonPos = -1;
                for (var j = 0; j < line.length; j++) {
                    if (line.charAt(j) === ':') {
                        colonPos = j;
                        break;
                    }
                }
                if (colonPos === -1) continue;

                var key = Utils.trim(line.substring(0, colonPos)).toLowerCase();
                if (key === '') continue;
                var value = Utils.trim(line.substring(colonPos + 1));
                this.headers[key] = value;
            }
        }

        this.code = xhr.status;
        this.content = xhr.responseText;
    }
    function Tag(id) {
        this.tag = document.getElementById(id);
        if (!this.tag) {
            console.error('Tag element not found: #' + id);
            return;
        }
        this.lastContent = '';
        this.isLastContentSaved = false;
    }
    Tag.prototype._handleTemp = function (isTemp) {
        if (this.isLastContentSaved) {
            this.tag.innerHTML = this.lastContent;
            this.lastContent = '';
            this.isLastContentSaved = false;
        }
        if (isTemp) {
            this.lastContent = this.tag.innerHTML;
            this.isLastContentSaved = true;
        }
    };
    Tag.prototype.set = function (content, isTemp) {
        this._handleTemp(isTemp);
        this.tag.innerHTML = content;
    };
    Tag.prototype.prepend = function (content, isTemp) {
        this._handleTemp(isTemp);
        this.tag.insertAdjacentHTML('afterbegin', content);
    };
    Tag.prototype.append = function (content, isTemp) {
        this._handleTemp(isTemp);
        this.tag.insertAdjacentHTML('beforeend', content);
    };
    Tag.prototype.remove = function () {
        if (this.tag && this.tag.parentNode) {
            this.tag.parentNode.removeChild(this.tag);
        }
    };
    function TagX() {
        this.globalRefs = {};
        this.globalVars = {};
        this.tab = {
            first: null,
            last: null
        };
        this.watchers = {};
        this.isRegistering = 0;
    };
    TagX.prototype.register = function(elements, tab = "") {
        this.registerDepth++;
        var tabRange = tab.split(/\s*:\s*/);
        var elementsLength = elements.length;

        for (var i = 0; i < elementsLength; i++) {
            var el = elements[i];
            var elAttributesLength = el.attributes.length;
            for (var j = 0; j < elAttributesLength; j++) {
                var attr = el.attributes[j];
                if (attr.name.substr(0, 6) === "x-ref-") {
                    var key = attr.name.slice(6);
                    var isDuplicate = false;
                    if (!this.globalRefs[key]) this.globalRefs[key] = [];
                    var globalRefsLength = this.globalRefs[key].length;
                    for (var k = 0; k < globalRefsLength; k++) {
                        if (this.globalRefs[key][k] === el) {
                            isDuplicate = true;
                            break;
                        }
                    }
                    if (!isDuplicate) this.globalRefs[key].push(el);
                    if (!this.globalVars.hasOwnProperty(key)) {
                        if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
                            this.globalVars[key] = el.checked;
                        } else {
                            this.globalVars[key] = el.value || el.getAttribute(attr.name);
                        }
                    }
                }
            }
            if (tabRange.length >= 2) {
                if (el.hasAttribute("x-ref-" + tabRange[0])) {
                    this.tab.first = el;
                }
                if (el.hasAttribute("x-ref-" + tabRange[1])) {
                    this.tab.last = el;
                }
            }
        }

        var that = this;
        var keyMap = {};
        for (var i = 0; i < elementsLength; i++) {
            var el = elements[i];
            if (el.hasAttribute("x-on-click")) {
                (function(el) {
                    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', 0);
                    if (!el.onkeydown) {
                        el.onkeydown = function(e) {
                            e = e || window.event;
                            if (e.key === "Enter" || (e.keyCode || e.which) === 13) {
                                that.processElement(el, el.getAttribute("x-on-click"));
                            }
                        };
                    }
                    el.onclick = Utils.throttle(function() {
                        that.processElement(el, el.getAttribute("x-on-click"));
                    }, 300);
                })(el);
            }
            if (el.hasAttribute("x-on-enter")) {
                (function(el) {
                    el.onmouseenter = function() {
                        that.processElement(el, el.getAttribute("x-on-enter"));
                    };
                })(el);
            }
            if (el.hasAttribute("x-on-leave")) {
                (function(el) {
                    el.onmouseleave = function() {
                        that.processElement(el, el.getAttribute("x-on-leave"));
                    };
                })(el);
            }
            if (el.hasAttribute("x-on-focus")) {
                (function(el) {
                    el.onfocus = function() {
                        that.processElement(el, el.getAttribute("x-on-focus"));
                    };
                })(el);
            }
            if (el.hasAttribute("x-on-blur")) {
                (function(el) {
                    el.onblur = function() {
                        that.processElement(el, el.getAttribute("x-on-blur"));
                    };
                })(el);
            }
            if (el.hasAttribute("x-on-input")) {
                (function(el) {
                    el.oninput = Utils.debounce(function() {
                        var elAttributesLength = el.attributes.length;
                        for (var j = 0; j < elAttributesLength; j++) {
                            var n = el.attributes[j].name;
                            if (n.substr(0, 8) === "x-cycle-" || n.substr(0, 7) === "x-attr-" || n.substr(0, 6) === "x-val-" || n.substr(0, 6) === "x-var-" || n.substr(0, 6) === "x-run-") el.setAttribute(n, this.value);
                        }
                        that.processElement(el, el.getAttribute("x-on-input"));
                    }, 300);
                })(el);
            }
            if (el.hasAttribute("x-on-key")) {
                (function(el) {
                    var keys = (el.getAttribute("x-on-key")).toLowerCase().split(/\s+/);
                    var keysLength = keys.length;
                    var keysObj = {}
                    for (var j = 0; j < keysLength; j++) {
                        keysObj[keys[j]] = true;
                    }
                    el.onkeydown = function(e) {
                        e = e || window.event;
                        var key = (e.key ? e.key: String.fromCharCode(e.keyCode || e.which)).toLowerCase();
                        if (keysObj[key]) {
                            e.preventDefault();
                            that.processElement(el, el.getAttribute("x-on-key-" + key));
                        }
                    };
                })(el);
            }
            if (el.hasAttribute("x-on-key-window")) {
                var keys = (el.getAttribute("x-on-key-window")).toLowerCase().split(/\s+/);
                var keysLength = keys.length;
                for (var j = 0; j < keysLength; j++) {
                    var key = keys[j];
                    if (!keyMap[key]) keyMap[key] = [];
                    keyMap[key].push(el);
                }
            }
        }

        window.onkeydown = function(e) {
            e = e || window.event;
            var key = (e.key ? e.key: String.fromCharCode(e.keyCode || e.which)).toLowerCase();
            if (keyMap[key]) {
                var keys = keyMap[key];
                var keysLength = keys.length;
                for (var i = 0; i < keysLength; i++) {
                    that.processElement(keys[i], keys[i].getAttribute("x-on-key-window-" + key));
                }
            }
            if (key === "tab" || key === 9) {
                if (e.shiftKey && document.activeElement === that.tab.first) {
                    e.preventDefault();
                    that.tab.last.focus();
                }
                if (!e.shiftKey && document.activeElement === that.tab.last) {
                    e.preventDefault();
                    that.tab.first.focus();
                }
            }
        };
        this.registerDepth--;
    };
    TagX.prototype.watch = function(key, callback) {
        if (!this.watchers[key]) this.watchers[key] = [];
        this.watchers[key].push(callback);
    };
    TagX.prototype.getRefs = function(key) {
        return this.globalRefs[key] || [];
    };
    TagX.prototype.getVar = function (key) {
        return this.globalVars[key];
    };
    TagX.prototype.setVar = function (key, value, el = null) {
        var valOld = this.globalVars[key];
        this.globalVars[key] = value;
        if (this.watchers[key]) {
            for (var w = 0; w < this.watchers[key].length; w++) {
                this.watchers[key][w](valOld, el);
            }
        }
        if (this.watchers["*"]) {
            for (var w = 0; w < this.watchers["*"].length; w++) {
                this.watchers["*"][w](key, valOld, el);
            }
        }
    };
    TagX.prototype.run = function(key, trigger) {
        var refs = this.getRefs(key);
        for (var i = 0; i < refs.length; i++) {
            this.processElement(refs[i], refs[i].getAttribute(trigger));
        }
    };
    TagX.prototype.clean = function() {
        var refs = {};
        var vals = {};
        for (var key in this.globalRefs) {
            var els = this.globalRefs[key];
            var elsLength = els.length;
            for (var i = 0; i < elsLength; i++) {
                var el = els[i];
                if (!document.body.contains(el)) continue;
                if (!refs[key]) refs[key] = [];
                refs[key].push(el);
                if (!vals.hasOwnProperty(key)) {
                    if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
                        vals[key] = el.checked;
                    } else {
                        vals[key] = el.value || (el.children.length === 0 ? el.innerHTML : "");
                    }
                }
            }
        }
        this.globalRefs = refs;
        this.globalVars = vals;
    };
    TagX.prototype.processElement = function(el, elValue) {
        if (this.registerDepth > 0) return;
        var that = this;
        if (this.isProcessing) {
            return setTimeout(function () {
                that.processElement(el, elValue);
            }, 1);
        }
        this.isProcessing = true;
        setTimeout(function () {
            that._processElement(el, elValue);
            setTimeout(function () {
                that.isProcessing = false;
            }, 1);
        }, 0);
    };
    TagX.prototype._processElement = function(el, elValue) {
        var cycles = [];
        var attrs = [];
        var data = {
            "x-val-": {},
            "x-var-": {},
            "x-run-": {}};

        var globalRefsLength = this.globalRefs.length;

        var mode = "";
        var rules = [];
        var rulesObj = {};

        elValue = Utils.trim(elValue || "");
        if (elValue === "") {
            mode = "*";
        } else if (elValue[0] === "!") {
            mode = "!";
            rules = elValue.slice(1).split(/\s+/);
        } else {
            rules = elValue.split(/\s+/)
        }

        var rulesLength = rules.length;
        for (var i = 0; i < rulesLength; i++) rulesObj[rules[i]] = true;

        var elAttributesLength = el.attributes.length;
        for (var i = 0; i < elAttributesLength; i++) {
            var attr = el.attributes[i];
            if (attr.name.substr(0, 8) === "x-cycle-" && (mode === "*" || (mode === "!" && !rulesObj.hasOwnProperty(attr.name.slice(8))) || (mode === "" && rulesObj.hasOwnProperty(attr.name.slice(8))))) {
                cycles.push(attr.name.slice(8));
            }
            if (attr.name.substr(0, 7) === "x-attr-" && (mode === "*" || (mode === "!" && !rulesObj.hasOwnProperty(attr.name.slice(7))) || (mode === "" && rulesObj.hasOwnProperty(attr.name.slice(7))))) {
                attrs.push(attr.name.slice(7));
            }
            if ((attr.name.substr(0, 6) === "x-val-" || attr.name.substr(0, 6) === "x-var-" || attr.name.substr(0, 6) === "x-run-") && (mode === "*" || (mode === "!" && !rulesObj.hasOwnProperty(attr.name.slice(6))) || (mode === "" && rulesObj.hasOwnProperty(attr.name.slice(6))))) {
                data[attr.name.substr(0, 6)][attr.name.slice(6)] = attr.value;
            }
        }

        var cyclesLength = cycles.length;
        for (var i = 0; i < cyclesLength; i++) {
            var key = cycles[i];
            var dataState = el.getAttribute("x-cycle-" + key) || "";
            var states = dataState.split(/\s+/);
            var els = this.globalRefs[key] || [];
            var elsLength = els.length;
            for (var j = 0; j < elsLength; j++) {
                var refEl = els[j];
                var className = refEl.className || "";
                var classList = className.split(/\s+/);
                var current = refEl.getAttribute('data-simulated-state') || classList[classList.length - 1];
                var currentIndex = -1;
                for (var k = 0; k < states.length; k++) {
                    if (current === states[k]) {
                        currentIndex = k;
                        break;
                    }
                }
                var newState = states[(currentIndex + 1) % states.length] || "_";
                if (current !== newState) {
                    refEl.setAttribute('data-simulated-state', newState);
                    (function(refEl) {
                        setTimeout(function() {
                            var classList = (refEl.className || "").split(/\s+/);
                            var liveState = classList[classList.length - 1];
                            var simulated = refEl.getAttribute('data-simulated-state');
                            if (simulated && simulated !== liveState) {
                                classList[classList.length - 1] = simulated;
                                refEl.className = classList.join(" ");
                                refEl.removeAttribute('data-simulated-state');
                            }
                        }, 16);
                    })(refEl);
                }
            }
        }

        var tabRange = (el.getAttribute("x-tab") || "").split(/\s*:\s*/);
        this.tab = {
            first: null,
            last: null
        };

        var focus = el.getAttribute("x-focus");
        var focusFound = false;

        for (var key in this.globalRefs) {
            var els = this.globalRefs[key];
            var elsLength = els.length;
            for (var i = 0; i < elsLength; i++) {
                var refEl = els[i];
                if (data["x-val-"].hasOwnProperty(key)) {
                    var val = data["x-val-"][key];
                    var tag = refEl.tagName.toUpperCase();
                    if ((tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") && val != refEl.value) {
                        if (tag === "INPUT" && (refEl.type === "checkbox" || refEl.type === "radio")) {
                            refEl.checked = (val === true || val === "true" || val === "1");
                        } else if (val != refEl.value) {
                            refEl.value = val;
                        }
                    } else if (refEl.children.length === 0 && val != refEl.innerHTML) {
                        refEl.innerHTML = val;
                    }
                }
                if (data["x-var-"].hasOwnProperty(key)) {
                    this.setVar(key, data["x-var-"][key], refEl);
                }
                if (data["x-run-"].hasOwnProperty(key)) {
                    var triggers = data["x-run-"][key].split(/\s+/);
                    var triggersLength = triggers.length;
                    for (k = 0; k < triggersLength; k++) {
                        this.run(key, triggers[k]);
                    }
                }
            }

            if (tabRange.length >= 2) {
                if (key === tabRange[0]) this.tab.first = refEl;
                if (key === tabRange[1]) this.tab.last = refEl;
            }

            if (focus && !focusFound) {
                if (key === focus) {
                    var focusRef = refEl;
                    setTimeout(function() {
                        focusRef.focus();
                    }, 75);
                    focusFound = true;
                }
            }
        }

        var attrsLength = attrs.length;
        for (var i = 0; i < attrsLength; i++) {
            var keyAttr = attrs[i];
            var keyAttrArr = keyAttr.split("_");
            var key = keyAttrArr[0];
            var attr = keyAttrArr.slice(1).join('_');
            var dataState = el.getAttribute("x-attr-" + keyAttr) || "";
            var states = dataState.split(/\s*\|\s*/);

            var els = this.globalRefs[key] || [];
            var elsLength = els.length;
            for (var j = 0; j < elsLength; j++) {
                var refEl = els[j];
                var current = refEl.getAttribute(attr);
                var currentIndex = -1;
                for (var k = 0; k < states.length; k++) {
                    if (current === states[k]) {
                        currentIndex = k;
                        break;
                    }
                }
                var newState = states[(currentIndex + 1) % states.length] || "_";
                var oldState = refEl.getAttribute(attr);
                if (oldState != newState) refEl.setAttribute(attr, newState);
            }
        }
    };

    global.Utils = Utils;
    global.Url = Url;
    global.Request = Request;
    global.Response = Response;
    global.Tag = Tag;
    global.TagX = TagX;
})();