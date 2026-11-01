// ==UserScript==
// @name         Voz bypass anti adblock
// @namespace    Voz bypass anti adblock
// @version      1.0
// @icon         https://www.google.com/s2/favicons?sz=64&domain=voz.vn
// @author       siritami
// @match        https://voz.vn/*
// @match        https://voz.vn/
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/siritami/userscript/refs/heads/main/voz-anti-adblock.user.js
// @updateURL    https://raw.githubusercontent.com/siritami/userscript/refs/heads/main/voz-anti-adblock.user.js
// ==/UserScript==
(function () {
    const fakeSlotEl = document.createElement('div');
    fakeSlotEl.id = 'voz-fake-slot';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:2px;height:2px;position:fixed;left:0;top:0;';
    fakeSlotEl.appendChild(iframe);
    fakeSlotEl.style.cssText = 'width:2px;height:2px;position:fixed;left:0;top:0;';
    (document.documentElement || document.body || document).appendChild(fakeSlotEl);

    const slot = {
        getSlotElementId: () => 'voz-fake-slot',
        getResponseInformation: () => ({}),
        getOutOfPage: () => false
    };
    const listeners = { slotRenderEnded: [] };
    window.googletag = {
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
    const origPush = window.googletag.cmd.push.bind(window.googletag.cmd);
    window.googletag.cmd.push = function (fn) {
        try { fn(); } catch (e) {}
        listeners.slotRenderEnded.forEach(fn2 => { try { fn2({slot, isEmpty: false}); } catch(e){} });
        return 1;
    };
})();
