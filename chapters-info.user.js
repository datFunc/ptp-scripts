// ==UserScript==
// @name         Add chapter info
// @namespace    https://raw.githubusercontent.com/datFunc
// @version      0.1
// @description  Add chapter information to the MediaInfo preview
// @author       PuNkFuSe
// @updateURL    https://raw.githubusercontent.com/datFunc/ptp-scripts/master/chapters-info.user.js
// @downloadURL  https://raw.githubusercontent.com/datFunc/ptp-scripts/master/chapters-info.user.js
// @match        http*://passthepopcorn.me/torrents.php*
// ==/UserScript==

(function () {
    'use strict';

    // Helper functions
    const createNode = function (ele) {
        return document.createElement(ele);
    };

    const append = function (parent, ele) {
        return parent.appendChild(ele.cloneNode(true));
    };

    const torrentInfoLink = document.querySelectorAll('.torrent-info-link');
    torrentInfoLink.forEach(link => {
        link.addEventListener('click', function () {
            setTimeout(() => {

                const
                    torrentInfoRow = link.parentElement.parentElement.nextElementSibling,
                    mediaInfoTable = link.parentElement.parentElement.nextElementSibling.querySelector('.mediainfo--in-release-description'),
                    mediaInfoTableSection = mediaInfoTable.querySelector('.mediainfo__section tbody'),
                    mediaInfoData = link.parentElement.parentElement.nextElementSibling.querySelector('.spoiler'),
                    tr = createNode('tr'),
                    td1 = createNode('td'),
                    td2 = createNode('td');

                tr.classList.add('tr-chapters');
                td1.textContent = 'Chapters:'
                td2.textContent = '...'

                var appendRow = function () {
                    append(tr, td1);
                    append(tr, td2);
                    append(mediaInfoTableSection, tr);
                }

                if (torrentInfoRow.classList.contains('hidden')) {
                    const chaptersRow = mediaInfoTable.querySelector('.tr-chapters');
                    chaptersRow.remove();
                } else {
                    const keyword = /Menu/gi;
                    if (mediaInfoData.textContent.match(keyword)) {
                        td2.textContent = 'Yes'
                        appendRow();
                    } else {
                        td2.textContent = 'No'
                        appendRow();
                    }
                }
            }, 1500); // <- You might need to increase this value if you have a slow connection.

        });
    });

})();
