function addCookie(name, value, days, path) {
    /**添加设置cookie**/
    var name = escape(name);
    var value = escape(value);
    var expires = new Date();
    expires.setTime(expires.getTime() + days * 3600000 * 24);
    //path=/，表示cookie能在整个网站下使用
    path = path == "" ? "" : ";path=" + path;
    //GMT(Greenwich Mean Time)是格林尼治平时，现在的标准时间，协调世界时是UTC
    //参数days只能是数字型
    var _expires = (typeof days) == "string" ? "" : ";expires=" + expires.toUTCString();
    document.cookie = name + "=" + value + _expires + path;
}

function hasCookie(name) {
    return document.cookie.indexOf(name) > 0;
}

function deleteCookie(name, path) {
    /**根据cookie的键，删除cookie，其实就是设置其失效**/
    var name = escape(name);
    var expires = new Date(0);
    path = path == "" ? "" : ";path=" + path;
    document.cookie = name + "=" + ";expires=" + expires.toUTCString() + path;
}

function logout() {
    httpPost(apiGatewayBase + userUrl + "/user/logout", {}).then(resp => {
        clearAuthTokens();
        window.location.reload();
    });
}

const LIVE_ACCESS_TOKEN_KEY = "live_access_token";
const LIVE_REFRESH_TOKEN_KEY = "live_refresh_token";
const LIVE_OAUTH_STATE_KEY = "live_oauth_state";
const LIVE_OAUTH_VERIFIER_KEY = "live_oauth_verifier";
const LIVE_OAUTH_REDIRECT_KEY = "live_oauth_redirect";
const LIVE_OAUTH_SILENT_NEXT_AT_KEY = "live_oauth_silent_next_at";

const liveTokenStore = window.CommonAuthSdk.createTokenStore({
    accessTokenKey: LIVE_ACCESS_TOKEN_KEY,
    refreshTokenKey: LIVE_REFRESH_TOKEN_KEY,
    stateKey: LIVE_OAUTH_STATE_KEY,
    verifierKey: LIVE_OAUTH_VERIFIER_KEY,
    redirectKey: LIVE_OAUTH_REDIRECT_KEY
});

function resolveLiveOAuthConfig() {
    const base = (window.oauth2Config && window.oauth2Config.baseUrl) || (window.oauth2Config && window.oauth2Config.authorizeEndpoint) || "";
    let baseUrl = base;
    if (base.indexOf("/oauth2/authorize") > -1) {
        baseUrl = base.substring(0, base.indexOf("/oauth2/authorize"));
    }
    var callbackPath = "/html/living_room_list.html";
    if (window.oauth2Config && window.oauth2Config.redirectUri) {
        try {
            var callbackUrl = new URL(window.oauth2Config.redirectUri, window.location.origin);
            callbackPath = callbackUrl.pathname || callbackPath;
        } catch (e) {
        }
    }
    return window.CommonAuthSdk.buildOAuthConfig({
        baseUrl: baseUrl,
        redirectOrigin: window.location.origin,
        clientId: window.oauth2Config.clientId,
        scope: window.oauth2Config.scope,
        authorizePath: "/oauth2/authorize",
        tokenPath: "/oauth2/token",
        redirectPath: callbackPath
    }, {
        clientId: "live-web-client",
        scope: "openid profile",
        baseError: "oauth2Config.baseUrl 未配置"
    });
}

const liveOAuthClient = window.CommonAuthSdk.createOAuthClient({
    getConfig: resolveLiveOAuthConfig,
    tokenStore: liveTokenStore,
    httpClient: axios
});

function getAccessToken() {
    return liveTokenStore.getAccessToken();
}

function getRefreshToken() {
    return liveTokenStore.getRefreshToken();
}

function setAuthTokens(accessToken, refreshToken) {
    liveTokenStore.setAccessToken(accessToken);
    if (refreshToken) {
        liveTokenStore.setRefreshToken(refreshToken);
    }
}

function clearAuthTokens() {
    liveTokenStore.clear();
}

function getNavigationType() {
    if (window.performance && typeof window.performance.getEntriesByType === "function") {
        var navEntries = window.performance.getEntriesByType("navigation");
        if (navEntries && navEntries.length > 0 && navEntries[0] && navEntries[0].type) {
            return navEntries[0].type;
        }
    }
    if (window.performance && window.performance.navigation) {
        if (window.performance.navigation.type === 1) {
            return "reload";
        }
        if (window.performance.navigation.type === 2) {
            return "back_forward";
        }
    }
    return "navigate";
}

function allowSilentSsoOnCurrentLoad() {
    var navType = getNavigationType();
    if (navType === "reload" || navType === "back_forward") {
        return true;
    }
    var query = window.location.search || "";
    return query.indexOf("silent_sso=1") > -1;
}

let isRefreshingToken = false;
let refreshQueue = [];

const axiosReq = axios.create({
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
})

axiosReq.interceptors.request.use(function(config) {
    var token = getAccessToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = "Bearer " + token;
    }
    return config;
});

function parseTokenResponse(resp) {
    if (!resp) {
        return null;
    }
    if (resp.access_token) {
        return resp;
    }
    if (resp.data && resp.data.access_token) {
        return resp.data;
    }
    return null;
}

function requestRefreshToken(refreshToken) {
    if (!refreshToken) {
        return Promise.resolve(null);
    }
    return liveOAuthClient.refreshToken(refreshToken).then(function(response) {
        return parseTokenResponse(response);
    }).catch(function() {
        return null;
    });
}

axiosReq.interceptors.response.use(function(response) {
    return response;
}, function(error) {
    if (!error || !error.response || error.response.status !== 401 || !error.config) {
        return Promise.reject(error);
    }
    var originalRequest = error.config;
    if (originalRequest.__retry) {
        clearAuthTokens();
        return Promise.reject(error);
    }
    var refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearAuthTokens();
        return Promise.reject(error);
    }
    if (isRefreshingToken) {
        return new Promise(function(resolve, reject) {
            refreshQueue.push({
                resolve: resolve,
                reject: reject
            });
        }).then(function(newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = "Bearer " + newToken;
            originalRequest.__retry = true;
            return axiosReq(originalRequest);
        });
    }
    isRefreshingToken = true;
    return requestRefreshToken(refreshToken).then(function(tokenResp) {
        isRefreshingToken = false;
        if (!tokenResp || !tokenResp.access_token) {
            clearAuthTokens();
            while (refreshQueue.length > 0) {
                var pending = refreshQueue.shift();
                pending.reject(error);
            }
            return Promise.reject(error);
        }
        setAuthTokens(tokenResp.access_token, tokenResp.refresh_token || refreshToken);
        while (refreshQueue.length > 0) {
            var queued = refreshQueue.shift();
            queued.resolve(tokenResp.access_token);
        }
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = "Bearer " + tokenResp.access_token;
        originalRequest.__retry = true;
        return axiosReq(originalRequest);
    }).catch(function(refreshError) {
        isRefreshingToken = false;
        clearAuthTokens();
        while (refreshQueue.length > 0) {
            var pending = refreshQueue.shift();
            pending.reject(refreshError);
        }
        return Promise.reject(refreshError);
    });
});

function httpPost(url, params) {
    let result = axiosReq.post(url,params).then(function(response){
        return response.data;
    },function(error) {
        //定义一个统一的错误对象返回
        var errorObj = new Object();
        errorObj.code=500;
        errorObj.msg = '亲，系统出小差了';
        return errorObj;
    })
    return result;
}

function startOAuthLogin() {
    if (!window.oauth2Config) {
        return;
    }
    var targetPath = window.location.pathname + (window.location.search || "") + (window.location.hash || "");
    liveOAuthClient.startLogin(targetPath);
}

function handleOAuthCallbackIfNeeded() {
    return liveOAuthClient.handleCallbackIfNeeded().then(function(callback) {
        if (!callback || !callback.handled) {
            return false;
        }
        if (!callback.success) {
            if (callback.error === "login_required" || callback.error === "interaction_required") {
                sessionStorage.setItem(LIVE_OAUTH_SILENT_NEXT_AT_KEY, String(Date.now() + 60 * 1000));
            }
            clearAuthTokens();
            return false;
        }
        sessionStorage.removeItem(LIVE_OAUTH_SILENT_NEXT_AT_KEY);
        var currentPath = window.location.pathname + (window.location.search || "") + (window.location.hash || "");
        if (callback.redirectPath && callback.redirectPath !== currentPath) {
            window.location.replace(callback.redirectPath);
            return true;
        }
        return true;
    });
}

function trySilentSsoLogin() {
    if (!window.oauth2Config || getAccessToken()) {
        return false;
    }
    if (!allowSilentSsoOnCurrentLoad()) {
        return false;
    }
    var query = window.location.search || "";
    if (query.indexOf("code=") > -1 || query.indexOf("state=") > -1 || query.indexOf("error=") > -1) {
        return false;
    }
    var nextAt = parseInt(sessionStorage.getItem(LIVE_OAUTH_SILENT_NEXT_AT_KEY) || "0", 10);
    if (nextAt > Date.now()) {
        return false;
    }
    sessionStorage.setItem(LIVE_OAUTH_SILENT_NEXT_AT_KEY, String(Date.now() + 15 * 1000));
    var targetPath = window.location.pathname + (window.location.search || "") + (window.location.hash || "");
    liveOAuthClient.startLogin(targetPath, { prompt: "none" });
    return true;
}

window.startOAuthLogin = startOAuthLogin;
window.handleOAuthCallbackIfNeeded = handleOAuthCallbackIfNeeded;
window.trySilentSsoLogin = trySilentSsoLogin;
window.clearAuthTokens = clearAuthTokens;
window.getAccessToken = getAccessToken;




//获取浏览器url重 ？后边的参数
function getQueryStr(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURI(r[2]);
    return null;
}

function isSuccess(resp) {
    return resp != "error" && resp.code == 200;
}


function sleep(delay) {
    for(var t = Date.now(); Date.now() - t <= delay;);
}

function utf8ByteToUnicodeStr(utf8Bytes){
    var unicodeStr ="";
    for (var pos = 0; pos < utf8Bytes.length;){
        var flag= utf8Bytes[pos];
        var unicode = 0 ;
        if ((flag >>>7) === 0 ) {
            unicodeStr+= String.fromCharCode(utf8Bytes[pos]);
            pos += 1;

        } else if ((flag &0xFC) === 0xFC ){
            unicode = (utf8Bytes[pos] & 0x3) << 30;
            unicode |= (utf8Bytes[pos+1] & 0x3F) << 24;
            unicode |= (utf8Bytes[pos+2] & 0x3F) << 18;
            unicode |= (utf8Bytes[pos+3] & 0x3F) << 12;
            unicode |= (utf8Bytes[pos+4] & 0x3F) << 6;
            unicode |= (utf8Bytes[pos+5] & 0x3F);
            unicodeStr+= String.fromCharCode(unicode) ;
            pos += 6;

        }else if ((flag &0xF8) === 0xF8 ){
            unicode = (utf8Bytes[pos] & 0x7) << 24;
            unicode |= (utf8Bytes[pos+1] & 0x3F) << 18;
            unicode |= (utf8Bytes[pos+2] & 0x3F) << 12;
            unicode |= (utf8Bytes[pos+3] & 0x3F) << 6;
            unicode |= (utf8Bytes[pos+4] & 0x3F);
            unicodeStr+= String.fromCharCode(unicode) ;
            pos += 5;

        } else if ((flag &0xF0) === 0xF0 ){
            unicode = (utf8Bytes[pos] & 0xF) << 18;
            unicode |= (utf8Bytes[pos+1] & 0x3F) << 12;
            unicode |= (utf8Bytes[pos+2] & 0x3F) << 6;
            unicode |= (utf8Bytes[pos+3] & 0x3F);
            unicodeStr+= String.fromCharCode(unicode) ;
            pos += 4;

        } else if ((flag &0xE0) === 0xE0 ){
            unicode = (utf8Bytes[pos] & 0x1F) << 12;;
            unicode |= (utf8Bytes[pos+1] & 0x3F) << 6;
            unicode |= (utf8Bytes[pos+2] & 0x3F);
            unicodeStr+= String.fromCharCode(unicode) ;
            pos += 3;

        } else if ((flag &0xC0) === 0xC0 ){ //110
            unicode = (utf8Bytes[pos] & 0x3F) << 6;
            unicode |= (utf8Bytes[pos+1] & 0x3F);
            unicodeStr+= String.fromCharCode(unicode) ;
            pos += 2;

        } else{
            unicodeStr+= String.fromCharCode(utf8Bytes[pos]);
            pos += 1;
        }
    }
    return unicodeStr;
}

function byteToString(arr) {
    if(typeof arr === 'string') {
        return arr;
    }
    var str = '',
        _arr = arr;
    for(var i = 0; i < _arr.length; i++) {
        var one = _arr[i].toString(2),
            v = one.match(/^1+?(?=0)/);
        if(v && one.length == 8) {
            var bytesLength = v[0].length;
            var store = _arr[i].toString(2).slice(7 - bytesLength);
            for(var st = 1; st < bytesLength; st++) {
                store += _arr[st + i].toString(2).slice(2);
            }
            str += String.fromCharCode(parseInt(store, 2));
            i += bytesLength - 1;
        } else {
            str += String.fromCharCode(_arr[i]);
        }
    }
    return str;
}

function textToArrayBuffer(s) {
    var i = s.length;
    var n = 0;
    var ba = new Array()
    for (var j = 0; j < i;) {
      var c = s.codePointAt(j);
      if (c < 128) {
        ba[n++] = c;
        j++;
      }
      else if ((c > 127) && (c < 2048)) {
        ba[n++] = (c >> 6) | 192;
        ba[n++] = (c & 63) | 128;
        j++;
      }
      else if ((c > 2047) && (c < 65536)) {
        ba[n++] = (c >> 12) | 224;
        ba[n++] = ((c >> 6) & 63) | 128;
        ba[n++] = (c & 63) | 128;
        j++;
      }
      else {
        ba[n++] = (c >> 18) | 240;
        ba[n++] = ((c >> 12) & 63) | 128;
        ba[n++] = ((c >> 6) & 63) | 128;
        ba[n++] = (c & 63) | 128;
        j+=2;
      }
    }
    return new Uint8Array(ba).buffer;
  }
