// ==UserScript==
// @name         Voz bypass anti adblock
// @namespace    Voz bypass anti adblock
// @version      1.9
// @icon         https://www.google.com/s2/favicons?sz=64&domain=voz.vn
// @author       siritami
// @match        https://voz.vn/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/TuiVibe/TuiUserscript/refs/heads/main/voz-anti-adblock.user.js
// @updateURL    https://raw.githubusercontent.com/TuiVibe/TuiUserscript/refs/heads/main/voz-anti-adblock.user.js
// ==/UserScript==
(function () {
    'use strict';

    function isAdblockRequest(url) {
        try {
            const parsed = new URL(String(url), location.href);
            return parsed.pathname === '/xfmg.php'
                || (parsed.pathname.endsWith('/index.php') && /(?:^|&)sam-item\/\d+\/get-backup(?:&|$)/.test(parsed.search.slice(1)));
        } catch (e) {
            const value = String(url);
            return value.includes('/xfmg.php') || /sam-item\/\d+\/get-backup/.test(value);
        }
    }

    const fakeSlotEl = document.createElement('div');
    fakeSlotEl.id = 'voz-fake-slot';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:2px;height:2px;position:fixed;left:0;top:0;border:0;';
    fakeSlotEl.appendChild(iframe);
    fakeSlotEl.style.cssText = 'width:2px;height:2px;position:fixed;left:0;top:0;';

    function attachSlot() {
        const root = document.documentElement || document.body;
        if (root && !document.getElementById('voz-fake-slot')) root.appendChild(fakeSlotEl);
    }
    attachSlot();
    document.addEventListener('DOMContentLoaded', attachSlot);

    const slot = {
        getSlotElementId: () => 'voz-fake-slot',
        getResponseInformation: () => ({}),
        getOutOfPage: () => false
    };
    const listeners = { slotRenderEnded: [] };

    const stub = {
        cmd: [],
        pubads: () => ({
            addEventListener: (ev, fn) => { if (ev === 'slotRenderEnded') listeners.slotRenderEnded.push(fn); },
            getSlots: () => [slot]
        }),
        getVersion: () => '999',
        display: () => {},
        defineSlot: () => slot,
        enableServices: () => {},
        destroySlots: () => true,
        pubadsReady: true
    };

    stub.cmd.push = function (fn) {
        try { fn(); } catch (e) {}
        listeners.slotRenderEnded.forEach(fn2 => { try { fn2({ slot, isEmpty: false }); } catch (e) {} });
        return 1;
    };

    try {
        Object.defineProperty(window, 'googletag', {
            get: () => stub,
            set: () => {},
            configurable: false
        });
    } catch (e) {
        window.googletag = stub;
    }

    try {
        const origBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function (url, data) {
            if (isAdblockRequest(url)) return true;
            return origBeacon(url, data);
        };
        const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            set(v) { if (!isAdblockRequest(v)) imgDesc.set.call(this, v); },
            get() { return imgDesc.get.call(this); }
        });
        const origFetch = window.fetch.bind(window);
        window.fetch = function (url, ...a) {
            if (isAdblockRequest(url)) return Promise.resolve(new Response(null, { status: 204 }));
            return origFetch(url, ...a);
        };
        const xhrOpen = XMLHttpRequest.prototype.open;
        const xhrSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...a) {
            this.__vozBlockedAdRequest = isAdblockRequest(url);
            return xhrOpen.call(this, method, url, ...a);
        };
        XMLHttpRequest.prototype.send = function (...a) {
            if (this.__vozBlockedAdRequest) return this.abort();
            return xhrSend.apply(this, a);
        };
    } catch (e) {}

    function keepXfrToken() {
        try {
            const token = window._xfr;
            if (!token) return;
            const prefix = (document.documentElement.getAttribute('data-cookie-prefix') || 'xf_') + 'ls';
            const m = document.cookie.match(new RegExp('(?:^|; )' + prefix + '=([^;]*)'));
            const list = (m ? m[1].split('_') : []).concat(token).slice(-10);
            document.cookie = prefix + '=' + list.join('_') + '; path=/; max-age=172800; samesite=lax; secure';
        } catch (e) {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', keepXfrToken);
    } else {
        keepXfrToken();
    }

    function positivePing() {
        const device = matchMedia('(max-width: 650px)').matches ? 'm' : 'd';
        const who = document.documentElement.getAttribute('data-logged-in') === 'true' ? 'u' : 'g';
        const img = new Image();
        img.setAttribute('src', '/xfmg.php?s=' + device + ':' + who + ':p1b0r1e0&n=' + Math.random().toString(36).slice(2));
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', positivePing);
    } else {
        positivePing();
    }

    const seenItems = new Map();
    function scanNode(node) {
        if (node.nodeType !== 1) return;
        const els = [];
        if (node.matches && node.matches('.samItem[data-id]')) els.push(node);
        if (node.querySelectorAll) els.push(...node.querySelectorAll('.samItem[data-id]'));
        for (const el of els) {
            const id = el.getAttribute('data-id');
            if (!id || seenItems.has(id)) continue;
            const posEl = el.closest('[data-position]');
            seenItems.set(id, { position: (posEl && posEl.getAttribute('data-position')) || '', sent: false });
        }
    }
    const mo = new MutationObserver(muts => {
        for (const m of muts) for (const n of m.addedNodes) scanNode(n);
    });
    try {
        mo.observe(document, { childList: true, subtree: true });
    } catch (e) {}

    function getCsrf() {
        if (window.XF && XF.config && XF.config.csrf) return XF.config.csrf;
        for (const s of document.scripts) {
            const m = s.textContent && s.textContent.match(/csrf:\s*'([^']+)'/);
            if (m) return m[1];
        }
        return null;
    }

    function sendTrackViews(final) {
        document.querySelectorAll('.samItem[data-id]').forEach(el => scanNode(el));
        const csrf = getCsrf();
        if (!csrf) return;
        for (const [id, item] of seenItems) {
            if (item.sent) continue;
            item.sent = true;
            const body = JSON.stringify({
                position_id: item.position || 'javascript',
                _xfResponseType: 'json',
                _xfWithData: 1,
                _xfRequestUri: location.pathname + location.search,
                _xfToken: csrf
            });
            fetch('/index.php?sam-item/' + encodeURIComponent(id) + '/track-view', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body
            }).catch(() => {});
        }
        if (final) mo.disconnect();
    }
    setTimeout(() => sendTrackViews(false), 4000);
    window.addEventListener('pagehide', () => sendTrackViews(true));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') sendTrackViews(false);
    });
})();
