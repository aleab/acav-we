!function(){var e,t={308:function(e,t,n){"use strict";var a=n(294),r=n(935),l=n(391),o=n(727),c=n(977),i=n(529);function s(e){var t=(0,a.useMemo)((function(){return e.toggleCallback}),[e.toggleCallback]),n=(0,a.useRef)(null),r=(0,a.useCallback)((function(e){e.preventDefault()}),[]),l=(0,a.useCallback)((function(e){n.current&&(null==t||t(n.current,n.current.hasAttribute("open")))}),[t]);return a.createElement("details",{ref:n,onMouseDown:r,onToggle:l},e.children)}function u(){var e=function(e){var t=e.href;return a.createElement("p",null,"Your browser doesn't support HTML5 video. Here is a ",a.createElement("a",{href:t},"link to the video")," instead.")},t=(0,a.useRef)(),n=(0,a.useReducer)((function(e,n){return t.current=n,n}),void 0),r=(0,l.Z)(n,2),o=(r[0],r[1]),c=(0,a.useCallback)((function(e,n){if(n){var a;if(Object.is(t.current,e))return;null===(a=t.current)||void 0===a||a.removeAttribute("open"),o(e)}else Object.is(t.current,e)&&o(void 0)}),[]);return a.createElement(a.Fragment,null,a.createElement("h2",{className:"lead fw-4"},"aCAV-WE"),a.createElement("blockquote",null,a.createElement("p",null," A highly customizable audio visualizer for ",a.createElement("a",{href:"https://www.wallpaperengine.io/"},"Wallpaper Engine"),".")),a.createElement("section",{id:"features"},a.createElement("h3",{className:"lead"},"Features"),a.createElement(s,{toggleCallback:c},a.createElement("summary",null,"Extensive customization options"),a.createElement("div",null,a.createElement("video",{width:"864",controls:!0,autoPlay:!1},a.createElement("source",{src:"./media/showcase.mp4",type:"video/mp4"}),a.createElement(e,{href:"./media/showcase.mp4"})))),a.createElement(s,{toggleCallback:c},a.createElement("summary",null,"Spotify integration"),a.createElement("div",null,a.createElement("video",{width:"864",controls:!0,autoPlay:!1},a.createElement("source",{src:"./media/spotify.mp4",type:"video/mp4"}),a.createElement(e,{href:"./media/spotify.mp4"})))),a.createElement(s,{toggleCallback:c},a.createElement("summary",null,"iCUE support for RGB hardware"),a.createElement("div",null,a.createElement("video",{width:"864",controls:!0,autoPlay:!1},a.createElement("source",{src:"./media/icue.mp4",type:"video/mp4"}),a.createElement(e,{href:"./media/icue.mp4"})),a.createElement("p",null,a.createElement("a",{href:"https://www.jamendo.com/track/1719234/skyline"},"Skiline (2020)")," by ",a.createElement("a",{href:"https://www.jamendo.com/artist/484695/samie-bower"},"Samie Bower")," is licensed under ",a.createElement("a",{href:"https://creativecommons.org/licenses/by-nc-nd/2.0/"},"CC BY-NC-ND"),".")))),a.createElement("section",{id:"donations"},a.createElement("h3",{className:"lead"},"Donations"),a.createElement("p",{className:"pb-0"},"Although absolutely not necessary, if you'd like to financially support me and this project, you can do so by clicking the button below."),a.createElement("form",{className:"d-inline-block",action:"https://www.paypal.com/donate",method:"post",target:"_blank"},a.createElement("input",{type:"hidden",name:"hosted_button_id",value:"4BY2XFJXQ982S"}),a.createElement("div",{className:"d-inline-flex flex-row-nowrap flex-align-center gap-x-2"},a.createElement("input",{className:"button",type:"submit",name:"submit",value:"Donate",title:"PayPal - The safer, easier way to pay online!","aria-label":"Donate with PayPal button"}),a.createElement("img",{className:"unselectable",src:"./media/PayPal.svg",alt:"PayPal logo",height:24})),a.createElement("img",{src:"https://www.paypal.com/en_US/i/scr/pixel.gif",alt:"",width:"1",height:"1",style:{border:0}}))))}var m,p=n(137),d=n(757),f=n.n(d),b=(n(147),n(129)),h=n.n(b),v=n(156);function E(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function y(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?E(Object(n),!0).forEach((function(t){(0,v.Z)(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):E(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function g(e){var t=e.color?{"--color":e.color}:void 0,n=e.size?{"--size":e.size}:void 0,r=e.gap?{"--gap":e.gap}:void 0;return a.createElement("div",{className:"spinner",style:y(y(y({},t),n),r)},a.createElement("div",{className:"bounce1"}),a.createElement("div",{className:"bounce2"}),a.createElement("div",{className:"bounce3"}))}var w=encodeURIComponent(["user-read-currently-playing"].join(" ")),k=encodeURIComponent(null!==(m="https://aleab.github.io/acav-we/token")?m:""),O="https://accounts.spotify.com/authorize?client_id=".concat("01d213381982490896feb4e522f1f1ae","&response_type=code&scope=").concat(w,"&redirect_uri=").concat(k);function N(e){var t,n=null===(t=e.location)||void 0===t?void 0:t.search,r=(0,a.useMemo)((function(){return n?h().parse(n,{ignoreQueryPrefix:!0}):null}),[n]),o=null==r?void 0:r.code,c=(0,a.useState)(),s=(0,l.Z)(c,2),u=s[0],m=s[1],d=(0,a.useState)(),b=(0,l.Z)(d,2),v=b[0],E=b[1],y=(0,a.useState)(!!o),w=(0,l.Z)(y,2),N=w[0],x=w[1],C=(0,a.useCallback)((function(e,t){window.history.replaceState(null,"","/token"),m(e),E(t),x(!1)}),[]);(0,a.useEffect)((function(){o?(x(!0),fetch("".concat("https://toastify.herokuapp.com/api/acav","/authorize_callback?code=").concat(o,"&redirect=").concat(k),{method:"GET",cache:"no-cache"}).then(function(){var e=(0,p.Z)(f().mark((function e(t){var n,a,r,l;return f().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,t.text();case 2:r=e.sent,e.t0=t.status,e.next=200===e.t0?6:429===e.t0?8:10;break;case 6:return r?n=r:console.error("Token | Unexpected no body returned! (200)"),e.abrupt("break",12);case 8:return a=r&&r.length>0?r:"You are rate-limited, please try again later.",e.abrupt("break",12);case 10:if(r&&r.length>0){try{l=JSON.parse(r)}catch(e){}void 0!==l&&l.error_description?a=l.error_description:(a="Server returned ".concat(t.status,"! Open the console to see the whole response."),console.error("Server returned ".concat(t.status,":"),r))}else a="Server returned ".concat(t.status,"!");return e.abrupt("break",12);case 12:C(n,a);case 13:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}()).catch((function(e){C(void 0,"ERROR: Unhandled exception!"),console.error("ERROR:",e)}))):x(!1)}),[o,C]);var j=(0,a.useRef)(null),P=(0,a.useCallback)((function(){if(null!=j.current){j.current.select();try{document.execCommand("copy")}catch(e){console.error("execCommand('copy') is not supported!")}}}),[]),R=(0,a.useCallback)((function(){return x(!0)}),[]);return a.createElement(a.Fragment,null,a.createElement("h3",{className:"lead"},"Request a token"),a.createElement("p",{className:"lead"},"Request a token to use the Spotify overlay feature in aCAV-WE.",a.createElement("br",null),"This token will only be valid for you to insert in Wallpaper Engine for a couple of minutes."),a.createElement("div",{className:"d-flex flex-column-nowrap gap-y-1"},a.createElement("div",{className:"d-flex flex-row-nowrap gap-x-2"},a.createElement("div",{className:"input-group"},a.createElement("input",{ref:j,type:"text",value:null!=u?u:"",disabled:!u,readOnly:!!u}),a.createElement("button",{type:"button",className:"d-flex flex-align-center button-outline",title:u?"Copy":void 0,disabled:!u,onClick:P,"aria-label":"Copy to Clipboard"},a.createElement(i.afI,{size:18}))),N?a.createElement("button",{type:"button",style:{width:"8.5rem"},disabled:!0,"aria-label":"Loading..."},a.createElement(g,{color:"var(--white-bright)",size:".5rem",gap:".35em"})):a.createElement("a",{href:O,className:"button",style:{width:"8.5rem"},onClick:R},"Request token")),v?a.createElement("p",{className:"small text-error"},v):null))}function x(){return a.createElement("div",{className:"text-align-center"},a.createElement("h1",{className:"lead border-0 mb-0"},"404"),a.createElement("h4",{className:"lead"},"There's absolutely nothing here!"))}function C(){var e,t,n=(0,a.useRef)(null),r=(0,a.useReducer)((function(e){return!e}),!1),s=(0,l.Z)(r,2),m=s[0],p=s[1],d=!m||(null!==(e=null===(t=n.current)||void 0===t?void 0:t.offsetWidth)&&void 0!==e?e:0)<=0?"navbar-nav":"navbar-nav active";return a.createElement(o.VK,{basename:"/acav-we"},a.createElement("header",{className:"navbar"},a.createElement("div",{className:"container"},a.createElement("button",{ref:n,type:"button",className:"button-link navbar-toggle",onClick:p,"aria-label":"Toggle Menu"},a.createElement(i.sOM,{size:24})),a.createElement(o.rU,{to:"/",className:"navbar-title"},"aCAV-WE"),a.createElement("a",{href:"//github.com/aleab/acav-we",rel:"external",className:"navbar-link order-1",style:{display:"flex"},"aria-label":"View on Github"},a.createElement(i.g_Y,{size:22})),a.createElement("nav",{className:"".concat(d," ml-80-auto order-2 order-80-none")},a.createElement(o.OL,{to:"/token",className:"nav-item nav-link",activeClassName:"active"},"Token")))),a.createElement("main",{className:"container"},a.createElement(c.rs,null,a.createElement(c.AW,{exact:!0,path:"/",component:u}),a.createElement(c.AW,{path:"/token",component:N}),a.createElement(c.AW,{path:"*",component:x}))))}r.render(a.createElement(C,null),document.getElementById("root"));for(var j=document.getElementsByTagName("noscript"),P=0;P<j.length;++P){var R;null===(R=j.item(P))||void 0===R||R.remove()}},654:function(){}},n={};function a(e){var r=n[e];if(void 0!==r)return r.exports;var l=n[e]={exports:{}};return t[e](l,l.exports,a),l.exports}a.m=t,e=[],a.O=function(t,n,r,l){if(!n){var o=1/0;for(s=0;s<e.length;s++){n=e[s][0],r=e[s][1],l=e[s][2];for(var c=!0,i=0;i<n.length;i++)(!1&l||o>=l)&&Object.keys(a.O).every((function(e){return a.O[e](n[i])}))?n.splice(i--,1):(c=!1,l<o&&(o=l));c&&(e.splice(s--,1),t=r())}return t}l=l||0;for(var s=e.length;s>0&&e[s-1][2]>l;s--)e[s]=e[s-1];e[s]=[n,r,l]},a.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(t,{a:t}),t},a.d=function(e,t){for(var n in t)a.o(t,n)&&!a.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},a.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),a.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},function(){var e={179:0};a.O.j=function(t){return 0===e[t]};var t=function(t,n){var r,l,o=n[0],c=n[1],i=n[2],s=0;for(r in c)a.o(c,r)&&(a.m[r]=c[r]);for(i&&i(a),t&&t(n);s<o.length;s++)l=o[s],a.o(e,l)&&e[l]&&e[l][0](),e[o[s]]=0;a.O()},n=self.webpackChunkacav_we=self.webpackChunkacav_we||[];n.forEach(t.bind(null,0)),n.push=t.bind(null,n.push.bind(n))}();var r=a.O(void 0,[514,647],(function(){return a(308)}));r=a.O(r)}();