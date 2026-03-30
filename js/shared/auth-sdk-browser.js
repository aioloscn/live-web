(function (global) {
    function trimTrailingSlash(value) { return (value || '').replace(/\/+$/, ''); }
    function normalizePath(value, fallback) {
        var path = (value || '').trim();
        if (!path) return fallback || '/';
        return path.startsWith('/') ? path : '/' + path;
    }
    function sanitizeRedirect(redirectPath) {
        var value = (redirectPath || '/').trim();
        if (!value || value.indexOf('http://') === 0 || value.indexOf('https://') === 0) return '/';
        var normalized = value.startsWith('/') ? value : '/' + value;
        if (normalized === '/login' || normalized.indexOf('/login?') === 0) return '/';
        return normalized;
    }
    function randomString(length) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        var bytes = new Uint8Array(length || 64);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, function (b) { return chars[b % chars.length]; }).join('');
    }
    function base64UrlEncode(bytes) {
        var binary = '';
        bytes.forEach(function (b) { binary += String.fromCharCode(b); });
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function sha256(plain) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain)).then(function (digest) {
            return new Uint8Array(digest);
        });
    }
    function buildCodeChallenge(verifier) {
        if (window.crypto && window.crypto.subtle) {
            return sha256(verifier).then(function (digest) {
                return { challenge: base64UrlEncode(digest), method: 'S256' };
            });
        }
        return Promise.resolve({ challenge: verifier, method: 'plain' });
    }
    function buildOAuthConfig(input, defaults) {
        var baseRaw = (input.baseUrl || '').trim();
        if (!baseRaw) throw new Error((defaults && defaults.baseError) || 'oauth base url is required');
        var baseParsed = new URL(baseRaw, window.location.origin);
        var oauthBase = trimTrailingSlash(baseParsed.origin + baseParsed.pathname);
        var redirectOriginRaw = (input.redirectOrigin || '').trim();
        var redirectOrigin = redirectOriginRaw ? trimTrailingSlash(new URL(redirectOriginRaw, window.location.origin).origin) : trimTrailingSlash(window.location.origin);
        return {
            oauthBase: oauthBase,
            redirectOrigin: redirectOrigin,
            clientId: (input.clientId || (defaults && defaults.clientId) || '').trim(),
            scope: (input.scope || (defaults && defaults.scope) || '').trim(),
            authorizeEndpoint: oauthBase + normalizePath(input.authorizePath, (defaults && defaults.authorizePath) || '/oauth2/authorize'),
            tokenEndpoint: oauthBase + normalizePath(input.tokenPath, (defaults && defaults.tokenPath) || '/oauth2/token'),
            redirectUri: redirectOrigin + normalizePath(input.redirectPath, (defaults && defaults.redirectPath) || '/login')
        };
    }
    function createTokenStore(opts) {
        var local = opts.local || window.localStorage;
        var session = opts.session || window.sessionStorage;
        return {
            getAccessToken: function () { return local.getItem(opts.accessTokenKey) || ''; },
            setAccessToken: function (v) { if (v) local.setItem(opts.accessTokenKey, v); },
            removeAccessToken: function () { local.removeItem(opts.accessTokenKey); },
            getRefreshToken: function () { return local.getItem(opts.refreshTokenKey) || ''; },
            setRefreshToken: function (v) { if (v) local.setItem(opts.refreshTokenKey, v); },
            removeRefreshToken: function () { local.removeItem(opts.refreshTokenKey); },
            setState: function (v) { session.setItem(opts.stateKey, v); },
            getState: function () { return (session.getItem(opts.stateKey) || '').trim(); },
            removeState: function () { session.removeItem(opts.stateKey); },
            setVerifier: function (v) { session.setItem(opts.verifierKey, v); },
            getVerifier: function () { return (session.getItem(opts.verifierKey) || '').trim(); },
            removeVerifier: function () { session.removeItem(opts.verifierKey); },
            setRedirect: function (v) { session.setItem(opts.redirectKey, sanitizeRedirect(v)); },
            getRedirect: function () { return sanitizeRedirect(session.getItem(opts.redirectKey) || '/'); },
            removeRedirect: function () { session.removeItem(opts.redirectKey); },
            clear: function () {
                local.removeItem(opts.accessTokenKey);
                local.removeItem(opts.refreshTokenKey);
                session.removeItem(opts.stateKey);
                session.removeItem(opts.verifierKey);
                session.removeItem(opts.redirectKey);
            }
        };
    }
    function createOAuthClient(opts) {
        var getConfig = opts.getConfig;
        var tokenStore = opts.tokenStore;
        var httpClient = opts.httpClient;
        function clearOAuthQuery() {
            var url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            url.searchParams.delete('error');
            url.searchParams.delete('error_description');
            window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }
        function exchangeCode(code, verifier) {
            var c = getConfig();
            var form = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: c.redirectUri,
                client_id: c.clientId,
                code_verifier: verifier
            });
            return httpClient.post(c.tokenEndpoint, form.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                withCredentials: true
            }).then(function (resp) { return resp.data || {}; });
        }
        return {
            startLogin: function (redirectPath, options) {
                var c = getConfig();
                var state = randomString(32);
                var verifier = randomString(96);
                tokenStore.setState(state);
                tokenStore.setVerifier(verifier);
                tokenStore.setRedirect(redirectPath || '/');
                return buildCodeChallenge(verifier).then(function (pkce) {
                    var params = new URLSearchParams({
                        response_type: 'code',
                        client_id: c.clientId,
                        redirect_uri: c.redirectUri,
                        scope: c.scope,
                        state: state,
                        code_challenge: pkce.challenge,
                        code_challenge_method: pkce.method
                    });
                    if (options && options.prompt) {
                        params.set('prompt', options.prompt);
                    }
                    if (options && options.extraParams) {
                        Object.keys(options.extraParams).forEach(function (key) {
                            var val = options.extraParams[key];
                            if (val !== undefined && val !== null && val !== '') {
                                params.set(key, String(val));
                            }
                        });
                    }
                    window.location.href = c.authorizeEndpoint + '?' + params.toString();
                });
            },
            refreshToken: function (refreshToken) {
                var c = getConfig();
                var form = new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: c.clientId
                });
                return httpClient.post(c.tokenEndpoint, form.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true
                }).then(function (resp) { return resp.data || {}; });
            },
            handleCallbackIfNeeded: function () {
                var url = new URL(window.location.href);
                var code = (url.searchParams.get('code') || '').trim();
                var state = (url.searchParams.get('state') || '').trim();
                var oauthError = (url.searchParams.get('error') || '').trim();
                if (!code && !oauthError) return Promise.resolve({ handled: false, success: false });
                var redirectPath = tokenStore.getRedirect();
                if (oauthError) {
                    clearOAuthQuery();
                    tokenStore.clear();
                    return Promise.resolve({ handled: true, success: false, redirectPath: redirectPath, error: oauthError });
                }
                var expectedState = tokenStore.getState();
                var verifier = tokenStore.getVerifier();
                if (!expectedState || !verifier || expectedState !== state) {
                    clearOAuthQuery();
                    tokenStore.clear();
                    return Promise.resolve({ handled: true, success: false, redirectPath: redirectPath, error: 'invalid_state' });
                }
                return exchangeCode(code, verifier).then(function (payload) {
                    var accessToken = payload.access_token || payload.accessToken || '';
                    var refreshToken = payload.refresh_token || payload.refreshToken || '';
                    if (!accessToken) throw new Error('missing_access_token');
                    tokenStore.setAccessToken(accessToken);
                    if (refreshToken) tokenStore.setRefreshToken(refreshToken); else tokenStore.removeRefreshToken();
                    clearOAuthQuery();
                    tokenStore.removeState();
                    tokenStore.removeVerifier();
                    tokenStore.removeRedirect();
                    return { handled: true, success: true, redirectPath: redirectPath };
                }).catch(function (e) {
                    clearOAuthQuery();
                    tokenStore.clear();
                    return { handled: true, success: false, redirectPath: redirectPath, error: e && e.message ? e.message : 'token_exchange_failed' };
                });
            },
            buildLogoutUrl: function (redirectPath) {
                var c = getConfig();
                var redirectUri = new URL(sanitizeRedirect(redirectPath || '/'), c.redirectOrigin).toString();
                return c.oauthBase + '/oauth2/front-logout?' + new URLSearchParams({ redirect_uri: redirectUri }).toString();
            }
        };
    }
    global.CommonAuthSdk = { createTokenStore: createTokenStore, buildOAuthConfig: buildOAuthConfig, createOAuthClient: createOAuthClient };
})(window);
