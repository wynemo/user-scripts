// ==UserScript==
// @name         在豆瓣查找Z-lib资源
// @description  直接查找在Z-lib网站上的书籍资源
// @namespace    http://tampermonkey.net/
// @version      0.5
// @author       Tim
// @match        https://book.douban.com/*
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

var domain = "https://zlib.knat.network/"

let ad = document.getElementById('dale_book_subject_top_right')
ad.parentNode.removeChild(ad);

let fetch_anchor = function (anchor) {
    return anchor.nextSibling.nodeValue.trim();
};

// 对使用GM_xmlhttpRequest返回的html文本进行处理并返回DOM树
function page_parser(responseText) {
    // 替换一些信息防止图片和页面脚本的加载，同时可能加快页面解析速度
    // responseText = responseText.replace(/s+src=/ig, ' data-src='); // 图片，部分外源脚本
    // responseText = responseText.replace(/<script[^>]*?>[\S\s]*?<\/script>/ig, ''); //页面脚本
    return (new DOMParser()).parseFromString(responseText, 'text/html');
}

function getDoc(url, callback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (responseDetail) {
            console.log(responseDetail.status);
            if (responseDetail.status === 200) {
                //let doc = page_parser(responseDetail.responseText);
                let doc = responseDetail.responseText;
                callback(doc, responseDetail);
            }
        }
    });
}

function prependDomStringInAside(domString) {
    let e = document.getElementsByClassName('aside')[0]
    let doc = new DOMParser().parseFromString(domString, "text/html");
    e.prepend(doc.body.firstChild)
}

function appendDomStringInZlib(domString) {
    let doc = new DOMParser().parseFromString(domString, "text/html");
    document.getElementById('zlib').append(doc.body.firstChild)
}

function getElementByXpath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

(function() {
    'use strict';

    let isbn = getElementByXpath('//*[@id="wrapper"]/h1/span').textContent.trim()
    let word_query = ''
    for (const word of isbn.split()) {
        word_query += 'title:%22' + word
    }

    prependDomStringInAside(`<div id="zlib" style="margin-bottom:20px"><h2>Z-Library · · · · · · </h2><div>正在获取资源...</div></div>`)
    let url = `${domain}/search?limit=100&query=${word_query}%22`
    console.log(url)
    getDoc(url, function (doc) {
        console.log('doc');
        document.getElementById('zlib').innerHTML = ''

        let obj = JSON.parse(doc)
        for (const element of obj.books) {
            let ipfs_url = `https://cloudflare-ipfs.com/ipfs/${element.ipfs_cid}?filename=${encodeURIComponent(element.title + '.' + element.extension)}`
             appendDomStringInZlib(`
<div class="c-aside name-offline"">
  <div style="padding-left:60px">
    <a href="${ipfs_url}" target="_blank">${element.title}.${element.extension}</a> ${element.year === '' ? '' : '(' + element.year + ')'}<br/>
    <span class="pl">
      year:${element.year} author:${element.author} size:${element.filesize} pages:${element.pages}
    </span>
  </div>
</div>`)
            appendDomStringInZlib(`<div class="clear"></div>`)
            appendDomStringInZlib(`<div class="ul" style="margin-bottom:12px;"></div>`)
        }
        return
    });
})();