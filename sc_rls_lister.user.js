// ==UserScript==
// @name         Scene Releases Lister
// @namespace    https://raw.githubusercontent.com/datFunc
// @version      0.1
// @description  List scene releases on torrent pages.
// @author       PuNkFuSe
// @updateURL    https://raw.githubusercontent.com/datFunc/ptp-scripts/master/sc_rls_lister-min.user.js
// @downloadURL  https://raw.githubusercontent.com/datFunc/ptp-scripts/master/sc_rls_lister-min.user.js
// @grant        GM_xmlhttpRequest
// @match        http*://passthepopcorn.me/torrents.php?id=*
// @icon         https://rawcdn.githack.com/datFunc/ptp-scripts/master/icons/list.svg
// ==/UserScript==

(() => {
    'use strict';

    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    // * To-do list:
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    // * 1. Priority: High:
    //+++++ -> A.
    //+++++ -> B.
    // * 2. Priority: Medium:
    //+++++ -> A.
    //+++++ -> B.
    // * 3. Priority: Low:
    //+++++ -> A.
    //+++++ -> B.
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

    // Utility functions
    const createNode = (ele) => {
        return document.createElement(ele);
    };

    const append = (parent, ele) => {
        return parent.appendChild(ele.cloneNode(true));
    };

    // Create a table for scene releases
    const sceneReleasesTable = createNode('table');
    sceneReleasesTable.classList.add('hidden', 'table', 'table--panel-like', 'table--bordered', 'table--striped');
    sceneReleasesTable.setAttribute('id', 'scene-releases-table');

    const torrentsTable = document.querySelector('#torrent-table');
    const requestsTable = document.querySelector('#requests');
    const encodingsTable = document.querySelector('#encode-offers-table');

    // Select each parent table header
    const torrentsTableHeader = document.querySelector('#torrent-table thead tr th:nth-child(1) strong');
    const requestsTableHeader = document.querySelector('#requests thead tr th:nth-child(1) strong');
    const encodingTableHeader = document.querySelector('#encode-offers-table thead tr th:nth-child(1) strong');

    // Add a tab link for the scene releases table
    const sceneReleasesTabLink = createNode('a');
    sceneReleasesTabLink.classList.add('go-to-scene-releases');
    sceneReleasesTabLink.textContent = ' | Scene Releases';
    sceneReleasesTabLink.setAttribute('href', '#');

    append(torrentsTableHeader, sceneReleasesTabLink);
    if (requestsTableHeader) append(requestsTableHeader, sceneReleasesTabLink);
    if (encodingTableHeader) append(encodingTableHeader, sceneReleasesTabLink);

    // Scene releases table template
    const shadowTableHeader = document.querySelector('#torrent-table thead tr th strong').innerHTML.replace('Torrents', '<a>Torrents</a>');

    sceneReleasesTable.innerHTML = `
    <table cellpadding="6" cellspacing="1" border="0" class="table table--panel-like table--bordered" id="requests">
        <thead>
            <tr>
                <th style="width: 48%;">
                    <strong>
                        ${shadowTableHeader}
                    </strong>
                </th>
                <th class="th-added">Added</th>
            </tr>
        </thead>
        <tbody id="scene-releases-body">
        </tbody>
    </table>`;

    torrentsTable.parentNode.insertBefore(sceneReleasesTable, torrentsTable.nextSibling);
    const tables = document.querySelectorAll(`
        #torrent-table,
        #requests,
        #encode-offers-table,
        #scene-releases-table
    `);

    tables.forEach((table) => {
        const AllTablesHeadLinks = table.querySelectorAll('thead tr th strong a');
        AllTablesHeadLinks.forEach((tableLink) => {
            tableLink.setAttribute('href', '#')
            // tableLink.removeAttribute('onclick');
            tableLink.setAttribute('onclick', 'return false');
            tableLink.addEventListener('click', () => {
                if (tableLink.textContent.includes('Torrents')) {
                    table.classList.add('hidden');
                    torrentsTable.classList.remove('hidden');
                } else if (tableLink.textContent.includes('Requests')) {
                    table.classList.add('hidden');
                    requestsTable.classList.remove('hidden');
                } else if (tableLink.textContent.includes('Encoding')) {
                    table.classList.add('hidden');
                    encodingsTable.classList.remove('hidden');
                } else if (tableLink.textContent.includes('Scene Releases')) {
                    table.classList.add('hidden');
                    sceneReleasesTable.classList.remove('hidden');
                }
            });
        });
    });

    // Find the IMDB container element, and extract the id to use it as a param to fetch data
    const imdbLinkContainer = document.querySelector('#imdb-title-link');

    // Note: This will ONLY be used if the imdb search query returned nothing.
    // srrdb label these releases as "unconfirmed".
    // Also note that the results of data may not always be accurate sometimes (Can't control it, we just display what srrdb send us).
    // Note: You can it to 'foreign:yes' to fetch foreign releases.
    const mediaTitle = document.querySelector('.page__title');
    const regex = new RegExp(/:|\[|-|'|"|,/gi);
    const title = mediaTitle.textContent.split(']')[0].replaceAll(regex, '').trim();
    const searchKeyword = title.replaceAll(' ', '/');
    const urlSecondary = `https://www.srrdb.com/api/search/${searchKeyword}/category:x264/foreign:no/`;

    // Get Media type, feature film, short, etc...
    const mediaType = document.querySelector('.basic-movie-list__torrent-edition__main');

    // RegExp for each group
    // Note: You can extend each group by adding more expressions for each group
    const labelSD = /BDRip|WEB|WEBRip|HDTV|PDTV|DVDR|DVD9|NTSC|DVDRip|Screener|TELESYNC|R5|DSR|Cam/gi;
    const labelHD = /720|1080|Bluray|\b(BDR)\b/gi;
    const labelUHD = /2160p|UHD/gi;
    const label3D = /3D/gi;
    const labelOther = /Extras|Bonus|Subpack|SUBFiX/gi;

    // Array for each group
    const rlsSD = [];
    const rlsHD = [];
    const rlsUHD = [];
    const rls3D = [];
    const rlsOther = [];
    const rlsAllSorted = [];

    const sceneRlsTD = document.querySelector('#scene-releases-body');
    // Create a table group
    const createGroup = (groupIdentifier, groupTitle) => {
        const trGroup = createNode('tr');
        const tdEdition = createNode('td');
        const span1 = createNode('span');
        const span2 = createNode('span');
        trGroup.classList.add('group_torrent');
        trGroup.setAttribute('id', groupIdentifier);
        tdEdition.classList.add('basic-movie-list__torrent-edition__main');
        tdEdition.setAttribute('colspan', '5;');
        // Note: Change the background-color to match the stylesheet you're using.
        tdEdition.setAttribute('style', 'background-color: #3a4055; width: 100%;');
        span2.setAttribute('style', 'font-weight: 400;');
        span1.textContent = mediaType.textContent;
        span2.textContent = groupTitle;
        append(tdEdition, span1);
        append(tdEdition, span2);
        append(trGroup, tdEdition);
        append(sceneRlsTD, trGroup);
    }

    // Parent group types
    const groupTypes = [
        ['group-parent-sd', ' - Standard Definition'],
        ['group-parent-hd', ' - High Definition'],
        ['group-parent-uhd', ' - Ultra High Definition'],
        ['group-parent-3d', ' - 3D'],
        ['group-parent-other', ' - Other']
    ];
    for (const args of groupTypes) createGroup(...args);
    const groupParentSD = document.querySelector('#group-parent-sd');
    const groupParentHD = document.querySelector('#group-parent-hd');
    const groupParentUHD = document.querySelector('#group-parent-uhd');
    const groupParent3D = document.querySelector('#group-parent-3d');
    const groupParentOther = document.querySelector('#group-parent-other');

    const allGroups = document.querySelectorAll('#group-parent-sd, #group-parent-hd, #group-parent-uhd, #group-parent-3d, #group-parent-other');
    allGroups.forEach(group => {
        group.style.display = 'none';
    });

    // Filter and sort response data
    const filterResData = (res) => {
        // Loop through response data and update each release value
        res.forEach(data => {
            // Note: You can update the data.value to sort the releases the way you want.
            // Example: If WEBRip data.value = '4'; and HDTV data.value = '5'; then HDTV will come before WEBRip, etc..
            // SD
            if (
                data.release.match(labelSD)
                && !data.release.match(labelHD)
                && !data.release.match(labelUHD)
                && !data.release.match(label3D)
                && !data.release.match(labelOther)) {
                if (data.release.match(/Cam/gi)) {
                    data.value = '12';
                }
                else if (data.release.match(/TELESYNC/gi)) {
                    data.value = '11';
                }
                else if (data.release.match(/Screener/gi)) {
                    data.value = '10';
                }
                else if (data.release.match(/R5/gi) && !data.release.match(/DVDR/gi)) {
                    data.value = '9';
                }
                else if (data.release.match(/DSR/gi)) {
                    data.value = '8';
                }
                else if (data.release.match(/DVDRip/gi)) {
                    data.value = '7';
                }
                else if (data.release.match(/PDTV/gi)) {
                    data.value = '6';
                }
                else if (data.release.match(/HDTV/gi)) {
                    data.value = '5';
                }
                else if (data.release.match(/WEBRip/gi)) {
                    data.value = '4';
                }
                else if (data.release.match(/BDRip/gi)) {
                    data.value = '3';
                }
                else if (data.release.match(/WEB/gi)) {
                    data.value = '2';
                }
                else if (data.release.match(/DVDR/gi) || data.release.match(/NTSC/gi)) {
                    data.value = '1';
                }
                else if (data.release.match(/DVD9/gi)) {
                    data.value = '0';
                }
                rlsSD.push(data);
                rlsAllSorted.push(data);
            }

            // HD
            else if (
                data.release.match(labelHD)
                && !data.release.match(labelUHD)
                && !data.release.match(label3D)
                && !data.release.match(labelOther)) {
                // Maybe add 720i and 1080i too??
                if (data.release.match(/HDTV/gi) && data.release.match(/720p/gi)) {
                    data.value = '6';
                } else if (data.release.match(/WEB/gi) && data.release.match(/720p/gi)) {
                    data.value = '5';
                } else if (data.release.match(/BluRay/gi) && data.release.match(/720p/gi)) {
                    data.value = '4';
                } else if (data.release.match(/HDTV/gi) && data.release.match(/1080p/gi)) {
                    data.value = '3';
                } else if (data.release.match(/WEB/gi) && data.release.match(/1080p/gi)) {
                    data.value = '2';
                } else if (data.release.match(/BluRay/gi) && data.release.match(/1080p/gi)) {
                    data.value = '1';
                } else if (data.release.match(/COMPLETE/gi) || data.release.match(/BD9/gi) || data.release.match(/\b(BDR)\b/gi)) {
                    data.value = '0';
                }
                rlsHD.push(data);
                rlsAllSorted.push(data);
            }

            // UHD
            else if (
                data.release.match(labelUHD)) {
                if (data.release.match(/WEB/gi)) {
                    data.value = '2';
                } else if (data.release.match(/BluRay/gi) && !data.release.match(/COMPLETE/gi)) {
                    data.value = '1';
                } else if (data.release.match(/COMPLETE/gi)) {
                    data.value = '0';
                }
                rlsUHD.push(data);
                rlsAllSorted.push(data);
            }

            // 3D
            else if (
                data.release.match(label3D)) {
                if (data.release.match(/1080p/gi) || data.release.match(/2160p/gi)) {
                    data.value = '1';
                } else if (data.release.match(/COMPLETE/gi)) {
                    data.value = '0';
                }
                rls3D.push(data);
                rlsAllSorted.push(data);
            }

            // Other
            // Note this group is not sorted
            else if (
                data.release.match(labelOther)
                && !data.release.match(labelHD)
                && !data.release.match(labelUHD)) {
                data.value = '0';
                rlsOther.push(data);
                rlsAllSorted.push(data);
            }

            // Other - Additional
            // Note this group is not sorted
            // This condition everything else, things like: Subs, etc...
            // Or anything that wasn't explicitly under any of RegExp groups.
            else {
                data.value = '0';
                rlsOther.push(data);
                rlsAllSorted.push(data);
            }
        });
        // Sort data response data based on the added values
        return rlsAllSorted.sort((a, b) => {
            // Note: You can use the console.log below for debugging,
            // If sorting went wrong, check if any of the releases is missing key, val.
            // console.log('\n', 'A:', a, 'Value of A:', a.value, '\n', 'B:', b, 'Value of B:', b.value);
            if (a.value > b.value) {
                return 1;
            } else {
                return -1;
            }
        });
    }

    // Tag the table elements. You don't say!
    const tagTableEle = () => {
        const titleExactMatch = title.replaceAll(' ', '.');
        rlsAllSorted.forEach(data => {
            // Build table content
            const tr = createNode('tr');
            const td = createNode('td');
            const td2 = createNode('td');
            const rlsLink = createNode('a');
            rlsLink.textContent = `${data.release}`;

            // SD
            if (
                data.release.match(labelSD)
                && !data.release.match(labelHD)
                && !data.release.match(labelUHD)
                && !data.release.match(label3D)
                && !data.release.match(labelOther)) {
                rlsLink.classList.add('rls-sd');
            }

            // HD
            else if (
                data.release.match(labelHD)
                && !data.release.match(labelUHD)
                && !data.release.match(label3D)
                && !data.release.match(labelOther)) {
                rlsLink.classList.add('rls-hd');
            }

            // UHD
            else if (
                data.release.match(labelUHD)) {
                rlsLink.classList.add('rls-uhd');
            }

            // 3D
            else if (
                data.release.match(label3D)) {
                rlsLink.classList.add('rls-3d');
            }

            // Other
            else if (
                data.release.match(labelOther)
                && !data.release.match(labelHD)
                && !data.release.match(labelUHD)) {
                rlsLink.classList.add('rls-other');
            }

            // Note: This condition catches things like: Subs, bonusm etc...
            // Other - Additional
            else {
                rlsLink.classList.add('rls-other');
            }

            // Highlight exact matches
            // To be used when using title as param, since you can get a lot of unrelated releases
            if (rlsLink.textContent.match(titleExactMatch)) {
                rlsLink.classList.add('exact-match');
            }

            // Append data to the table
            td2.textContent = `${data.date}`;
            td.setAttribute('style', 'width: 80%;');
            td2.setAttribute('style', 'width: 20%;');
            rlsLink.setAttribute('href', `https://www.srrdb.com/release/details/${data.release}`);
            rlsLink.setAttribute('target', '_blank;');
            append(td, rlsLink);
            append(tr, td);
            append(tr, td2);
            append(sceneRlsTD, tr);
        });
    }

    // Match each release type and append it under it's parent group
    const matchAndAppendEle = () => {
        const toMatchRls = (rlsIdentifier, rlsParent) => {
            const rlsOfType = document.querySelectorAll(rlsIdentifier);
            if (rlsOfType) {
                rlsParent.style.display = 'table-row';
                rlsOfType.forEach(rls => {
                    const rlsTableRow = rls.parentElement.parentElement;
                    if (rlsParent.parentNode) {
                        rlsParent.parentNode.insertBefore(rlsTableRow, rlsParent.nextSibling);
                    }
                });
                [rlsParent].forEach(parent => {
                    if (parent.nextSibling === null || parent.nextSibling.classList.contains('group_torrent')) {
                        parent.remove();
                    } else {
                        parent.style.display = 'table-row';
                    }
                });
            }
        }
        const rlsDataMatcher = [
            ['.rls-sd', groupParentSD],
            ['.rls-hd', groupParentHD],
            ['.rls-uhd', groupParentUHD],
            ['.rls-3d', groupParent3D],
            ['.rls-other', groupParentOther]
        ];
        for (const args of rlsDataMatcher) toMatchRls(...args);
    }

    // Display a message and a link when we got no results
    const noResults = () => {
        const tableHeadAddedOn = document.querySelector('.th-added');
        tableHeadAddedOn.remove();
        const tr = createNode('tr');
        const td = createNode('td');
        const searchLink = createNode('a');
        td.textContent = `No releases found, to search manually ${searchLink}`;
        td.setAttribute('style', 'width: 100%;');
        // Dropping the year from the title in order to get more results
        const searchKeywordNoYear = mediaTitle.textContent.split('[')[0].replaceAll(regex, '').trim().replaceAll(' ', '/');
        searchLink.setAttribute('href', `https://www.srrdb.com/browse/${searchKeywordNoYear}/1`);
        searchLink.setAttribute('target', '_blank;');
        searchLink.textContent = 'click here.';
        append(td, searchLink);
        append(tr, td);
        append(sceneRlsTD, tr);
    }

    // Display an error msg, when something goes wrong
    const throwError = (msg) => {
        console.log('⚠️', msg);
        const tr = createNode('tr');
        const td = createNode('td');
        td.textContent = '⚠️' + msg;
        td.setAttribute('style', 'width: 100%; color: red; font-weight: bold;');
        append(tr, td);
        append(sceneRlsTD, tr);
    }

    const highlightExactMatch = document.getElementsByClassName('exact-match');

    const patchAndDisplayData = (res) => {
        filterResData(res);
        tagTableEle();
        matchAndAppendEle();
    }

    // Fetch data
    async function fetchData() {
        let urlPrimary;
        let response;
        let data;
        let respData;
        let resultsCount;
        try {
            if (imdbLinkContainer) {
                const imdbLink = imdbLinkContainer.getAttribute('href').trim();
                const imdbID = imdbLink.split('/')[4];
                // Note: You can change it to 'foreign:yes' to fetch foreign releases.
                urlPrimary = `https://www.srrdb.com/api/search/imdb:${imdbID}/foreign:no/`;
                response = await fetch(urlPrimary);
                data = await response.json();
                respData = await data.results;
                resultsCount = await data.resultsCount;
                if (resultsCount > 0) {
                    patchAndDisplayData(respData);
                } else {
                    response = await fetch(urlSecondary);
                    data = await response.json();
                    respData = await data.results;
                    resultsCount = await data.resultsCount;
                    if (resultsCount > 0) {
                        patchAndDisplayData(respData);
                        // Highlight links, if there are lots of releases found, since they may or may not be related.
                        if (resultsCount > 5) {
                            for (let i = 0; i < highlightExactMatch.length; i++) {
                                const exactMatchElement = highlightExactMatch[i];
                                exactMatchElement.style.fontWeight = 'bold';
                                exactMatchElement.style.color = '#418b00';
                            }
                        }
                    } else {
                        noResults();
                    }
                }
            } else {
                response = await fetch(urlSecondary);
                data = await response.json();
                respData = await data.results;
                resultsCount = await data.resultsCount;
                if (resultsCount > 0) {
                    patchAndDisplayData(respData);
                    // Highlight links, if there are lots of releases found, since they may or may not be related.
                    if (resultsCount > 5) {
                        for (let i = 0; i < highlightExactMatch.length; i++) {
                            const exactMatchElement = highlightExactMatch[i];
                            exactMatchElement.style.fontWeight = 'bold';
                            exactMatchElement.style.color = '#418b00';
                        }
                    }
                } else {
                    noResults();
                }
            }
        } catch (error) {
            throwError(error);
        }
    }
    fetchData();
})();
