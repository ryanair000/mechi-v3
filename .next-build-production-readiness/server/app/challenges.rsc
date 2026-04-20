1:"$Sreact.fragment"
2:I[2593,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","7177","static/chunks/app/layout-8b0cb2f7b4dee0aa.js"],""]
4:I[5932,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","7177","static/chunks/app/layout-8b0cb2f7b4dee0aa.js"],"AppProviders"]
5:I[7121,[],""]
6:I[4581,[],""]
7:"$Sreact.suspense"
8:I[4639,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","7177","static/chunks/app/layout-8b0cb2f7b4dee0aa.js"],"GoogleAnalyticsPageView"]
9:I[8616,[],"ClientSegmentRoot"]
a:I[6976,["8500","static/chunks/8500-3953cc33eeceb44e.js","818","static/chunks/818-81a6aecb014d039b.js","7002","static/chunks/7002-1d71a47869695bd3.js","4944","static/chunks/app/(app)/layout-da2f5b8b7294fa08.js"],"default"]
11:I[7123,[],"default",1]
:HL["/_next/static/css/d248155eae57a5d0.css","style"]
3:T4f5,
  (() => {
    try {
      const root = document.documentElement;
      const storedTheme = localStorage.getItem('mechi-theme');
      const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
      const themeColor = theme === 'dark' ? '#0B1121' : '#F8FBFD';
      root.classList.toggle('dark', theme === 'dark');
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      const themeMetaTags = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
      const primaryThemeMeta = themeMetaTags[0] || document.createElement('meta');
      if (themeMetaTags.length === 0) {
        primaryThemeMeta.name = 'theme-color';
        document.head.appendChild(primaryThemeMeta);
      }
      primaryThemeMeta.setAttribute('content', themeColor);
      primaryThemeMeta.removeAttribute('media');
      themeMetaTags.slice(1).forEach((meta) => meta.remove());
      let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
      if (!colorSchemeMeta) {
        colorSchemeMeta = document.createElement('meta');
        colorSchemeMeta.name = 'color-scheme';
        document.head.appendChild(colorSchemeMeta);
      }
      colorSchemeMeta.setAttribute('content', theme);
    } catch {}
  })();
0:{"P":null,"c":["","challenges"],"q":"","i":false,"f":[[["",{"children":["(app)",{"children":["challenges",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",16],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/css/d248155eae57a5d0.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"font-sans dark","data-theme":"dark","style":{"colorScheme":"dark"},"suppressHydrationWarning":true,"children":[["$","head",null,{"children":["$","$L2",null,{"id":"mechi-theme-init","strategy":"beforeInteractive","children":"$3"}]}],["$","body",null,{"children":[["$","$L4",null,{"children":["$","$L5",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L6",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":404}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}],["$","$7",null,{"fallback":null,"children":["$","$L8",null,{"measurementId":"G-KVY9G79JK1"}]}],["$","$L2",null,{"src":"https://www.googletagmanager.com/gtag/js?id=G-KVY9G79JK1","strategy":"afterInteractive"}],["$","$L2",null,{"id":"google-analytics-config","strategy":"afterInteractive","children":"\n    window.dataLayer = window.dataLayer || [];\n    function gtag(){dataLayer.push(arguments);}\n    window.gtag = gtag;\n    gtag('js', new Date());\n    gtag('config', \"G-KVY9G79JK1\", { send_page_view: false });\n  "}]]}]]}]]}],{"children":[["$","$1","c",{"children":[null,["$","$L9",null,{"Component":"$a","slots":{"children":["$","$L5",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L6",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[[["$","title",null,{"children":"404: This page could not be found."}],"$Lb"],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]},"serverProvidedParams":{"params":{},"promises":["$@c"]}}]]}],{"children":["$Ld",{"children":["$Le",{},null,false,null]},null,false,"$@f"]},null,false,null]},null,false,null],"$L10",false]],"m":"$undefined","G":["$11",[]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"rUl5ESDLZxahewiwPIr4y"}
12:I[1304,[],"ClientPageRoot"]
13:I[4526,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","8455","static/chunks/8455-885d8396343c6c6c.js","1110","static/chunks/app/(app)/challenges/page-1e1d228dbe7db3d4.js"],"default"]
16:I[484,[],"OutletBoundary"]
19:I[484,[],"ViewportBoundary"]
1b:I[484,[],"MetadataBoundary"]
b:["$","div",null,{"style":"$0:f:0:1:0:props:children:1:props:children:1:props:children:0:props:children:props:notFound:0:1:props:style","children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":"$0:f:0:1:0:props:children:1:props:children:1:props:children:0:props:children:props:notFound:0:1:props:children:props:children:1:props:style","children":404}],["$","div",null,{"style":"$0:f:0:1:0:props:children:1:props:children:1:props:children:0:props:children:props:notFound:0:1:props:children:props:children:2:props:style","children":["$","h2",null,{"style":"$0:f:0:1:0:props:children:1:props:children:1:props:children:0:props:children:props:notFound:0:1:props:children:props:children:2:props:children:props:style","children":"This page could not be found."}]}]]}]}]
d:["$","$1","c",{"children":[null,["$","$L5",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L6",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
e:["$","$1","c",{"children":[["$","$L12",null,{"Component":"$13","serverProvidedParams":{"searchParams":{},"params":"$0:f:0:1:1:children:0:props:children:1:props:serverProvidedParams:params","promises":["$@14","$@15"]}}],null,["$","$L16",null,{"children":["$","$7",null,{"name":"Next.MetadataOutlet","children":"$@17"}]}]]}]
18:[]
f:"$W18"
10:["$","$1","h",{"children":[null,["$","$L19",null,{"children":"$L1a"}],["$","div",null,{"hidden":true,"children":["$","$L1b",null,{"children":["$","$7",null,{"name":"Next.Metadata","children":"$L1c"}]}]}],null]}]
c:"$0:f:0:1:1:children:0:props:children:1:props:serverProvidedParams:params"
14:{}
15:"$0:f:0:1:1:children:0:props:children:1:props:serverProvidedParams:params"
1a:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1"}],["$","meta","2",{"name":"theme-color","content":"#0B1121"}],["$","meta","3",{"name":"color-scheme","content":"dark"}]]
1d:I[6869,[],"IconMark"]
17:null
1c:[["$","title","0",{"children":"Mechi | Compete. Connect. Rise."}],["$","meta","1",{"name":"description","content":"Mechi helps East African players find proper 1v1s, clean lobbies, and prize-backed tournaments without the WhatsApp chaos."}],["$","meta","2",{"name":"keywords","content":"mechi,gaming,matchmaking,east africa,kenya,tanzania,uganda,rwanda,ethiopia,esports,1v1,competitive gaming,efootball,ea fc,tekken"}],["$","meta","3",{"property":"og:title","content":"Mechi | Compete. Connect. Rise."}],["$","meta","4",{"property":"og:description","content":"Queue clean 1v1s, spin up proper lobbies, and run prize-backed tournaments for players across East Africa in one place."}],["$","meta","5",{"property":"og:url","content":"https://mechi.club"}],["$","meta","6",{"property":"og:site_name","content":"Mechi"}],["$","meta","7",{"property":"og:locale","content":"en"}],["$","meta","8",{"property":"og:type","content":"website"}],["$","meta","9",{"name":"twitter:card","content":"summary_large_image"}],["$","meta","10",{"name":"twitter:title","content":"Mechi | Compete. Connect. Rise."}],["$","meta","11",{"name":"twitter:description","content":"Players across Kenya, Tanzania, Uganda, Rwanda, and Ethiopia use Mechi for cleaner 1v1s, better lobbies, and smoother tournament runs."}],["$","link","12",{"rel":"icon","href":"/favicon.ico?d3f60d4a6aeee6b1","type":"image/x-icon","sizes":"256x256"}],["$","link","13",{"rel":"icon","href":"/icon.png?9e61ca689c47f748","type":"image/png","sizes":"512x512"}],["$","link","14",{"rel":"apple-touch-icon","href":"/apple-icon.png?bdf8bd0df1bde2d6","type":"image/png","sizes":"180x180"}],["$","$L1d","15",{}]]
