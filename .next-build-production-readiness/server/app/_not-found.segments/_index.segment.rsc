1:"$Sreact.fragment"
2:I[2593,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","7177","static/chunks/app/layout-8b0cb2f7b4dee0aa.js"],""]
4:I[5932,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","7177","static/chunks/app/layout-8b0cb2f7b4dee0aa.js"],"AppProviders"]
5:I[7121,[],""]
6:I[4581,[],""]
7:"$Sreact.suspense"
8:I[4639,["8500","static/chunks/8500-3953cc33eeceb44e.js","7281","static/chunks/7281-97c308b213402b77.js","7177","static/chunks/app/layout-8b0cb2f7b4dee0aa.js"],"GoogleAnalyticsPageView"]
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
0:{"rsc":["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/css/d248155eae57a5d0.css","precedence":"next"}]],["$","html",null,{"lang":"en","className":"font-sans dark","data-theme":"dark","style":{"colorScheme":"dark"},"suppressHydrationWarning":true,"children":[["$","head",null,{"children":["$","$L2",null,{"id":"mechi-theme-init","strategy":"beforeInteractive","children":"$3"}]}],["$","body",null,{"children":[["$","$L4",null,{"children":["$","$L5",null,{"parallelRouterKey":"children","template":["$","$L6",null,{}]}]}],["$","$7",null,{"fallback":null,"children":["$","$L8",null,{"measurementId":"G-KVY9G79JK1"}]}],["$","$L2",null,{"src":"https://www.googletagmanager.com/gtag/js?id=G-KVY9G79JK1","strategy":"afterInteractive"}],["$","$L2",null,{"id":"google-analytics-config","strategy":"afterInteractive","children":"\n    window.dataLayer = window.dataLayer || [];\n    function gtag(){dataLayer.push(arguments);}\n    window.gtag = gtag;\n    gtag('js', new Date());\n    gtag('config', \"G-KVY9G79JK1\", { send_page_view: false });\n  "}]]}]]}]]}],"isPartial":false,"staleTime":300,"varyParams":null,"buildId":"rUl5ESDLZxahewiwPIr4y"}
