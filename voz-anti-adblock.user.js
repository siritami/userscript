// ==UserScript==
// @name         Voz bypass anti adblock
// @namespace    Voz bypass anti adblock
// @version      1.1
// @icon         https://www.google.com/s2/favicons?sz=64&domain=voz.vn
// @author       siritami
// @match        https://voz.vn/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/siritami/userscript/main/voz-anti-adblock.user.js
// @updateURL    https://github.com/siritami/userscript/main/voz-anti-adblock.user.js
// ==/UserScript==
(function () {
    'use strict';

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
            if (String(url).includes('/xfmg.php')) return true;
            return origBeacon(url, data);
        };
        const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            set(v) { if (!String(v).includes('/xfmg.php')) imgDesc.set.call(this, v); },
            get() { return imgDesc.get.call(this); }
        });
        const origFetch = window.fetch.bind(window);
        window.fetch = function (url, ...a) {
            if (String(url).includes('/xfmg.php')) return Promise.resolve(new Response('', { status: 204 }));
            return origFetch(url, ...a);
        };
    } catch (e) {}
})();
