// ==UserScript==
// @name         Voz bypass anti adblock
// @namespace    Voz bypass anti adblock
// @version      1.4
// @icon         https://www.google.com/s2/favicons?sz=64&domain=voz.vn
// @author       siritami
// @match        https://voz.vn/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/siritami/userscript/refs/heads/main/voz-anti-adblock.user.js
// @updateURL    https://raw.githubusercontent.com/siritami/userscript/refs/heads/main/voz-anti-adblock.user.js
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
})();
