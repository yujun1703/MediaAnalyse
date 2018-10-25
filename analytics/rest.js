/*
 * Intel WebRTC SDK version 4.0.0
 * Copyright (c) 2018 Intel <http://webrtc.intel.com>
 * Homepage: http://webrtc.intel.com
 */


var ICS_REST, Url = require("url"), spawn = require("child_process").spawn, fs = require("fs"),
    XMLHttpRequest = function () {
        var t, e, r, n = this, i = require("http"), s = require("https"), o = {};
        "object" == typeof arguments[0] && null !== arguments[0] && "boolean" == typeof arguments[0].rejectUnauthorized && (r = arguments[0].rejectUnauthorized);
        var a = {"User-Agent": "node.js", Accept: "*/*"}, c = !1, u = !1, f = a;
        this.UNSENT = 0, this.OPENED = 1, this.HEADERS_RECEIVED = 2, this.LOADING = 3, this.DONE = 4, this.readyState = this.UNSENT, this.onreadystatechange = null, this.responseText = "", this.responseXML = "", this.status = null, this.statusText = null, this.open = function (t, e, r, n, i) {
            o = {
                method: t,
                url: e.toString(),
                async: "boolean" != typeof r || r,
                user: n || null,
                password: i || null
            }, this.abort(), d(this.OPENED)
        }, this.setRequestHeader = function (t, e) {
            if (this.readyState != this.OPENED) throw"INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN";
            if (c) throw"INVALID_STATE_ERR: send flag is true";
            f[t] = e
        }, this.getResponseHeader = function (t) {
            return this.readyState > this.OPENED && e.headers[t] && !u ? e.headers[t] : null
        }, this.getAllResponseHeaders = function () {
            if (this.readyState < this.HEADERS_RECEIVED || u) return "";
            var t = "";
            for (var r in e.headers) t += r + ": " + e.headers[r] + "\r\n";
            return t.substr(0, t.length - 2)
        }, this.send = function (a) {
            if (this.readyState != this.OPENED) throw"INVALID_STATE_ERR: connection must be opened before send() is called";
            if (c) throw"INVALID_STATE_ERR: send has already been called";
            var h = !1, p = Url.parse(o.url);
            switch (p.protocol) {
                case"https:":
                    h = !0;
                case"http:":
                    var l = p.hostname;
                    break;
                case void 0:
                case"":
                    l = "localhost";
                    break;
                default:
                    throw"Protocol not supported."
            }
            var v = p.port || (h ? 443 : 80), g = p.pathname + (p.search ? p.search : "");
            if (this.setRequestHeader("Host", l), o.user) {
                void 0 === o.password && (o.password = "");
                var y = new Buffer(o.user + ":" + o.password);
                f.Authorization = "Basic " + y.toString("base64")
            }
            "GET" == o.method || "HEAD" == o.method ? a = null : a && (this.setRequestHeader("Content-Length", Buffer.byteLength(a)), f["Content-Type"] || this.setRequestHeader("Content-Type", "text/plain;charset=UTF-8"));
            var m = {host: l, port: v, path: g, method: o.method, headers: f};
            if (h && void 0 !== r && (m.rejectUnauthorized = r), u = !1, !o.hasOwnProperty("async") || o.async) {
                var S = h ? s.request : i.request;
                c = !0, "function" == typeof n.onreadystatechange && n.onreadystatechange(), t = S(m, function (t) {
                    (e = t).setEncoding("utf8"), d(n.HEADERS_RECEIVED), n.status = e.statusCode, e.on("data", function (t) {
                        t && (n.responseText += t), c && d(n.LOADING)
                    }), e.on("end", function () {
                        c && (d(n.DONE), c = !1)
                    }), e.on("error", function (t) {
                        n.handleError(t)
                    })
                }).on("error", function (t) {
                    n.handleError(t)
                }), a && t.write(a), t.end()
            } else {
                var E = ".node-xmlhttprequest-sync-" + process.pid;
                fs.writeFileSync(E, "", "utf8");
                var T = "var http = require('http'), https = require('https'), fs = require('fs');var doRequest = http" + (h ? "s" : "") + ".request;var options = " + JSON.stringify(m) + ";var responseText = '';var req = doRequest(options, function(response) {response.setEncoding('utf8');response.on('data', function(chunk) {responseText += chunk;});response.on('end', function() {fs.writeFileSync('" + E + "', 'NODE-XMLHTTPREQUEST-STATUS:' + response.statusCode + ',' + responseText, 'utf8');});response.on('error', function(error) {fs.writeFileSync('" + E + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');});}).on('error', function(error) {fs.writeFileSync('" + E + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');});" + (a ? "req.write('" + a.replace(/'/g, "\\'") + "');" : "") + "req.end();";
                for (syncProc = spawn(process.argv[0], ["-e", T]); "" == (n.responseText = fs.readFileSync(E, "utf8"));) ;
                if (syncProc.stdin.end(), fs.unlinkSync(E), n.responseText.match(/^NODE-XMLHTTPREQUEST-ERROR:/)) {
                    var R = n.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR:/, "");
                    n.handleError(R)
                } else n.status = n.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:([0-9]*),.*/, "$1"), n.responseText = n.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:[0-9]*,(.*)/, "$1"), d(n.DONE)
            }
        }, this.handleError = function (t) {
            this.status = 503, this.statusText = t, this.responseText = t.stack, u = !0, d(this.DONE)
        }, this.abort = function () {
            t && (t.abort(), t = null), f = a, this.responseText = "", this.responseXML = "", u = !0, this.readyState === this.UNSENT || this.readyState === this.OPENED && !c || this.readyState === this.DONE || (c = !1, d(this.DONE)), this.readyState = this.UNSENT
        };
        var h = {};
        this.addEventListener = function (t, e) {
            t in h || (h[t] = []), h[t].push(e)
        };
        var d = function (t) {
            if (n.readyState = t, "function" == typeof n.onreadystatechange && n.onreadystatechange(), "readystatechange" in h) for (var e = h.readystatechange.length, r = 0; r < e; r++) h.readystatechange[r].call(n)
        }
    }, CryptoJS = CryptoJS || function (t, e) {
        var r = {}, n = r.lib = {}, i = n.Base = function () {
            function t() {
            }

            return {
                extend: function (e) {
                    t.prototype = this;
                    var r = new t;
                    return e && r.mixIn(e), r.$super = this, r
                }, create: function () {
                    var t = this.extend();
                    return t.init.apply(t, arguments), t
                }, init: function () {
                }, mixIn: function (t) {
                    for (var e in t) t.hasOwnProperty(e) && (this[e] = t[e]);
                    t.hasOwnProperty("toString") && (this.toString = t.toString)
                }, clone: function () {
                    return this.$super.extend(this)
                }
            }
        }(), s = n.WordArray = i.extend({
            init: function (t, e) {
                t = this.words = t || [], this.sigBytes = void 0 != e ? e : 4 * t.length
            }, toString: function (t) {
                return (t || a).stringify(this)
            }, concat: function (t) {
                var e = this.words, r = t.words, n = this.sigBytes;
                t = t.sigBytes;
                if (this.clamp(), n % 4) for (var i = 0; i < t; i++) e[n + i >>> 2] |= (r[i >>> 2] >>> 24 - i % 4 * 8 & 255) << 24 - (n + i) % 4 * 8; else if (65535 < r.length) for (i = 0; i < t; i += 4) e[n + i >>> 2] = r[i >>> 2]; else e.push.apply(e, r);
                return this.sigBytes += t, this
            }, clamp: function () {
                var e = this.words, r = this.sigBytes;
                e[r >>> 2] &= 4294967295 << 32 - r % 4 * 8, e.length = t.ceil(r / 4)
            }, clone: function () {
                var t = i.clone.call(this);
                return t.words = this.words.slice(0), t
            }, random: function (e) {
                for (var r = [], n = 0; n < e; n += 4) r.push(4294967296 * t.random() | 0);
                return s.create(r, e)
            }
        }), o = r.enc = {}, a = o.Hex = {
            stringify: function (t) {
                for (var e = t.words, r = (t = t.sigBytes, []), n = 0; n < t; n++) {
                    var i = e[n >>> 2] >>> 24 - n % 4 * 8 & 255;
                    r.push((i >>> 4).toString(16)), r.push((15 & i).toString(16))
                }
                return r.join("")
            }, parse: function (t) {
                for (var e = t.length, r = [], n = 0; n < e; n += 2) r[n >>> 3] |= parseInt(t.substr(n, 2), 16) << 24 - n % 8 * 4;
                return s.create(r, e / 2)
            }
        }, c = o.Latin1 = {
            stringify: function (t) {
                for (var e = t.words, r = (t = t.sigBytes, []), n = 0; n < t; n++) r.push(String.fromCharCode(e[n >>> 2] >>> 24 - n % 4 * 8 & 255));
                return r.join("")
            }, parse: function (t) {
                for (var e = t.length, r = [], n = 0; n < e; n++) r[n >>> 2] |= (255 & t.charCodeAt(n)) << 24 - n % 4 * 8;
                return s.create(r, e)
            }
        }, u = o.Utf8 = {
            stringify: function (t) {
                try {
                    return decodeURIComponent(escape(c.stringify(t)))
                } catch (t) {
                    throw Error("Malformed UTF-8 data")
                }
            }, parse: function (t) {
                return c.parse(unescape(encodeURIComponent(t)))
            }
        }, f = n.BufferedBlockAlgorithm = i.extend({
            reset: function () {
                this._data = s.create(), this._nDataBytes = 0
            }, _append: function (t) {
                "string" == typeof t && (t = u.parse(t)), this._data.concat(t), this._nDataBytes += t.sigBytes
            }, _process: function (e) {
                var r = this._data, n = r.words, i = r.sigBytes, o = this.blockSize, a = i / (4 * o);
                e = (a = e ? t.ceil(a) : t.max((0 | a) - this._minBufferSize, 0)) * o, i = t.min(4 * e, i);
                if (e) {
                    for (var c = 0; c < e; c += o) this._doProcessBlock(n, c);
                    c = n.splice(0, e), r.sigBytes -= i
                }
                return s.create(c, i)
            }, clone: function () {
                var t = i.clone.call(this);
                return t._data = this._data.clone(), t
            }, _minBufferSize: 0
        });
        n.Hasher = f.extend({
            init: function () {
                this.reset()
            }, reset: function () {
                f.reset.call(this), this._doReset()
            }, update: function (t) {
                return this._append(t), this._process(), this
            }, finalize: function (t) {
                return t && this._append(t), this._doFinalize(), this._hash
            }, clone: function () {
                var t = f.clone.call(this);
                return t._hash = this._hash.clone(), t
            }, blockSize: 16, _createHelper: function (t) {
                return function (e, r) {
                    return t.create(r).finalize(e)
                }
            }, _createHmacHelper: function (t) {
                return function (e, r) {
                    return h.HMAC.create(t, r).finalize(e)
                }
            }
        });
        var h = r.algo = {};
        return r
    }(Math);
!function (t) {
    var e = CryptoJS, r = (n = e.lib).WordArray, n = n.Hasher, i = e.algo, s = [], o = [];
    !function () {
        function e(e) {
            for (var r = t.sqrt(e), n = 2; n <= r; n++) if (!(e % n)) return !1;
            return !0
        }

        function r(t) {
            return 4294967296 * (t - (0 | t)) | 0
        }

        for (var n = 2, i = 0; 64 > i;) e(n) && (8 > i && (s[i] = r(t.pow(n, .5))), o[i] = r(t.pow(n, 1 / 3)), i++), n++
    }();
    var a = [];
    i = i.SHA256 = n.extend({
        _doReset: function () {
            this._hash = r.create(s.slice(0))
        }, _doProcessBlock: function (t, e) {
            for (var r = this._hash.words, n = r[0], i = r[1], s = r[2], c = r[3], u = r[4], f = r[5], h = r[6], d = r[7], p = 0; 64 > p; p++) {
                if (16 > p) a[p] = 0 | t[e + p]; else {
                    var l = a[p - 15], v = a[p - 2];
                    a[p] = ((l << 25 | l >>> 7) ^ (l << 14 | l >>> 18) ^ l >>> 3) + a[p - 7] + ((v << 15 | v >>> 17) ^ (v << 13 | v >>> 19) ^ v >>> 10) + a[p - 16]
                }
                l = d + ((u << 26 | u >>> 6) ^ (u << 21 | u >>> 11) ^ (u << 7 | u >>> 25)) + (u & f ^ ~u & h) + o[p] + a[p], v = ((n << 30 | n >>> 2) ^ (n << 19 | n >>> 13) ^ (n << 10 | n >>> 22)) + (n & i ^ n & s ^ i & s), d = h, h = f, f = u, u = c + l | 0, c = s, s = i, i = n, n = l + v | 0
            }
            r[0] = r[0] + n | 0, r[1] = r[1] + i | 0, r[2] = r[2] + s | 0, r[3] = r[3] + c | 0, r[4] = r[4] + u | 0, r[5] = r[5] + f | 0, r[6] = r[6] + h | 0, r[7] = r[7] + d | 0
        }, _doFinalize: function () {
            var t = this._data, e = t.words, r = 8 * this._nDataBytes, n = 8 * t.sigBytes;
            e[n >>> 5] |= 128 << 24 - n % 32, e[15 + (n + 64 >>> 9 << 4)] = r, t.sigBytes = 4 * e.length, this._process()
        }
    });
    e.SHA256 = n._createHelper(i), e.HmacSHA256 = n._createHmacHelper(i)
}(Math), function () {
    var t = CryptoJS, e = t.enc.Utf8;
    t.algo.HMAC = t.lib.Base.extend({
        init: function (t, r) {
            t = this._hasher = t.create(), "string" == typeof r && (r = e.parse(r));
            var n = t.blockSize, i = 4 * n;
            r.sigBytes > i && (r = t.finalize(r));
            for (var s = this._oKey = r.clone(), o = this._iKey = r.clone(), a = s.words, c = o.words, u = 0; u < n; u++) a[u] ^= 1549556828, c[u] ^= 909522486;
            s.sigBytes = o.sigBytes = i, this.reset()
        }, reset: function () {
            var t = this._hasher;
            t.reset(), t.update(this._iKey)
        }, update: function (t) {
            return this._hasher.update(t), this
        }, finalize: function (t) {
            var e = this._hasher;
            t = e.finalize(t);
            return e.reset(), e.finalize(this._oKey.clone().concat(t))
        }
    })
}(), (ICS_REST = ICS_REST || {}).Base64 = function (t) {
    "use strict";
    var e, r, n, i, s, o, a, c, u;
    for (-1, e = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"], r = [], s = 0; s < e.length; s += 1) r[e[s]] = s;
    return o = function (t) {
        n = t, i = 0
    }, a = function () {
        var t;
        return n ? i >= n.length ? -1 : (t = 255 & n.charCodeAt(i), i += 1, t) : -1
    }, c = function () {
        if (!n) return -1;
        for (; ;) {
            if (i >= n.length) return -1;
            var t = n.charAt(i);
            if (i += 1, r[t]) return r[t];
            if ("A" === t) return 0
        }
    }, u = function (t) {
        return 1 === (t = t.toString(16)).length && (t = "0" + t), t = "%" + t, unescape(t)
    }, {
        encodeBase64: function (t) {
            var r, n, i;
            for (o(t), r = "", n = new Array(3), i = !1; !i && -1 !== (n[0] = a());) n[1] = a(), n[2] = a(), r += e[n[0] >> 2], -1 !== n[1] ? (r += e[n[0] << 4 & 48 | n[1] >> 4], -1 !== n[2] ? (r += e[n[1] << 2 & 60 | n[2] >> 6], r += e[63 & n[2]]) : (r += e[n[1] << 2 & 60], r += "=", i = !0)) : (r += e[n[0] << 4 & 48], r += "=", r += "=", i = !0);
            return r
        }, decodeBase64: function (t) {
            var e, r, n;
            for (o(t), e = "", r = new Array(4), n = !1; !n && -1 !== (r[0] = c()) && -1 !== (r[1] = c());) r[2] = c(), r[3] = c(), e += u(r[0] << 2 & 255 | r[1] >> 4), -1 !== r[2] ? (e += u(r[1] << 4 & 255 | r[2] >> 2), -1 !== r[3] ? e += u(r[2] << 6 & 255 | r[3]) : n = !0) : n = !0;
            return e
        }
    }
}(), (ICS_REST = ICS_REST || {}).API = function (t) {
    "use strict";
    var e = {service: void 0, key: void 0, url: void 0, rejectUnauthorizedCert: void 0};

    function r(r, n, i, s, o) {
        if (e.service) {
            var a, c, u, f = (new Date).getTime(), h = require("crypto").randomBytes(8).toString("hex"),
                d = "MAuth realm=http://marte3.dit.upm.es,mauth_signature_method=HMAC_SHA256",
                p = (a = f + "," + h, c = e.key, u = CryptoJS.HmacSHA256(a, c).toString(CryptoJS.enc.Hex), t.Base64.encodeBase64(u));
            d += ",mauth_serviceid=", d += e.service, d += ",mauth_cnonce=", d += h, d += ",mauth_timestamp=", d += f, d += ",mauth_signature=", d += p;
            var l = new XMLHttpRequest({rejectUnauthorized: e.rejectUnauthorizedCert});
            l.onreadystatechange = function () {
                if (4 === l.readyState) switch (l.status) {
                    case 100:
                    case 200:
                    case 201:
                    case 202:
                    case 203:
                    case 204:
                    case 205:
                        "function" == typeof s && s(l.responseText);
                        break;
                    default:
                        "function" == typeof o && o(l.status, l.responseText)
                }
            }, l.open(r, e.url + n, !0), l.setRequestHeader("Authorization", d), void 0 !== i ? (l.setRequestHeader("Content-Type", "application/json"), l.send(JSON.stringify(i))) : l.send()
        } else "function" == typeof o && o(401, "ICS REST API is not initialized!!")
    }

    function n(t) {
        var e = {};
        return t.forEach(function (t) {
            e[t.name] = {mediaMixing: t.mediaMixing}
        }), e
    }

    return {
        init: function (t, r, n, i) {
            if ("string" != typeof t || "" === t) throw new TypeError("Invalid service ID");
            if ("string" != typeof r || "" === r) throw new TypeError("Invalid service key");
            if ("string" != typeof n || "" === n) throw new TypeError("Invalid URL.");
            if ("boolean" != typeof i && void 0 !== i) throw new TypeError("Invalid certificate setting");
            e.service = t, e.key = r, e.url = n.endsWith("/") ? n + "v1/" : n + "/v1/", e.rejectUnauthorizedCert = void 0 === i || i
        }, createRoom: function (t, e, i, s) {
            e || (e = {}), e.viewports && (e.views = n(e.viewports), delete e.viewports), r("POST", "rooms", {
                name: t,
                options: e
            }, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s)
        }, getRooms: function (t, e) {
            r("GET", "rooms", void 0, function (e) {
                var r = JSON.parse(e);
                t(r)
            }, e)
        }, getRoom: function (t, e, n) {
            "string" == typeof t ? "" !== t.trim() ? r("GET", "rooms/" + t, void 0, function (t) {
                var r = JSON.parse(t);
                e(r)
            }, n) : n(401, "Empty room ID") : n(401, "Invalid room ID.")
        }, updateRoom: function (t, e, i, s) {
            e && e.viewports && (e.views = n(e.viewports), delete e.viewports), r("PUT", "rooms/" + t, e || {}, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s)
        }, updateRoomPartially: function (t, e, n, i) {
            r("PATCH", "rooms/" + roomId, e || [], function (t) {
                var e = JSON.parse(t);
                n(e)
            }, i)
        }, deleteRoom: function (t, e, n) {
            r("DELETE", "rooms/" + t, void 0, function (t) {
                e(t)
            }, n)
        }, getParticipants: function (t, e, n) {
            r("GET", "rooms/" + t + "/participants/", void 0, function (t) {
                var r = JSON.parse(t);
                e(r)
            }, n)
        }, getParticipant: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid participant ID");
            r("GET", "rooms/" + t + "/participants/" + e, void 0, function (t) {
                var e = JSON.parse(t);
                n(e)
            }, i)
        }, updateParticipant: function (t, e, n, i, s) {
            return "string" != typeof e || 0 === e.trim().length ? s("Invalid participant ID") : n instanceof Array ? void r("PATCH", "rooms/" + t + "/participants/" + e, n, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s) : s("Invalid update list")
        }, dropParticipant: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid participant ID");
            r("DELETE", "rooms/" + t + "/participants/" + e, void 0, function (t) {
                n(t)
            }, i)
        }, getStreams: function (t, e, n) {
            r("GET", "rooms/" + t + "/streams/", void 0, function (t) {
                var r = JSON.parse(t);
                e(r)
            }, n)
        }, getStream: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid stream ID");
            r("GET", "rooms/" + t + "/streams/" + e, void 0, function (t) {
                var e = JSON.parse(t);
                n(e)
            }, i)
        }, updateStream: function (t, e, n, i, s) {
            return "string" != typeof e || 0 === e.trim().length ? s("Invalid stream ID") : n instanceof Array ? void r("PATCH", "rooms/" + t + "/streams/" + e, n, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s) : s("Invalid update list")
        }, deleteStream: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid stream ID");
            r("DELETE", "rooms/" + t + "/streams/" + e, void 0, function (t) {
                n(t)
            }, i)
        }, startStreamingIn: function (t, e, n, i, s, o) {
            r("POST", "rooms/" + t + "/streaming-ins/", {
                connection: {
                    url: e,
                    transportProtocol: n.protocol,
                    bufferSize: n.bufferSize
                }, media: i
            }, function (t) {
                var e = JSON.parse(t);
                s(e)
            }, o)
        }, stopStreamingIn: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid stream ID");
            r("DELETE", "rooms/" + t + "/streaming-ins/" + e, void 0, function (t) {
                n(t)
            }, i)
        }, getStreamingOuts: function (t, e, n) {
            r("GET", "rooms/" + t + "/streaming-outs/", void 0, function (t) {
                var r = JSON.parse(t);
                e(r)
            }, n)
        }, startStreamingOut: function (t, e, n, i, s) {
            r("POST", "rooms/" + t + "/streaming-outs/", {url: e, media: n}, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s)
        }, updateStreamingOut: function (t, e, n, i, s) {
            return "string" != typeof e || 0 === e.trim().length ? s("Invalid streamingOut ID") : n instanceof Array ? void r("PATCH", "rooms/" + t + "/streaming-outs/" + e, n, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s) : s("Invalid update list")
        }, stopStreamingOut: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid streamingOut ID");
            r("DELETE", "rooms/" + t + "/streaming-outs/" + e, void 0, function (t) {
                n(t)
            }, i)
        }, getRecordings: function (t, e, n) {
            r("GET", "rooms/" + t + "/recordings/", void 0, function (t) {
                var r = JSON.parse(t);
                e(r)
            }, n)
        }, startRecording: function (t, e, n, i, s) {
            r("POST", "rooms/" + t + "/recordings/", {container: e, media: n}, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s)
        }, updateRecording: function (t, e, n, i, s) {
            return "string" != typeof e || 0 === e.trim().length ? s("Invalid recording ID") : n instanceof Array ? void r("PATCH", "rooms/" + t + "/recordings/" + e, n, function (t) {
                var e = JSON.parse(t);
                i(e)
            }, s) : s("Invalid update list")
        }, stopRecording: function (t, e, n, i) {
            if ("string" != typeof e || 0 === e.trim().length) return i("Invalid recording ID");
            r("DELETE", "rooms/" + t + "/recordings/" + e, void 0, function (t) {
                n(t)
            }, i)
        }, createToken: function (t, e, n, i, s, o) {
            "string" == typeof t && "string" == typeof e && "string" == typeof n ? r("POST", "rooms/" + t + "/tokens/", {
                preference: i,
                user: e,
                role: n
            }, s, o) : "function" == typeof o && o(400, "Invalid argument.")
        }
    }
}(ICS_REST), module.exports = ICS_REST;