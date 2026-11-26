/* Çevrimdışı çalışma katmanı: ürünün sunucu isteklerini kayıtlı/üretilmiş veriden cevaplar.
   window.__MOCK = { "GET /api/...": {s, ct, r}, ... } ve isteğe bağlı window.__HANDLERS (durumlu cevaplar). */
(function(){
  var D = window.__MOCK || {};
  var H = window.__HANDLERS || [];
  var isDate = function(v){ return /^\d{4}-\d{2}-\d{2}/.test(decodeURIComponent(v)); };
  var parseQ = function(q){ var o={}; (q||'').split('&').filter(Boolean).forEach(function(kv){ var i=kv.indexOf('='); var k=i<0?kv:kv.slice(0,i), v=i<0?'':kv.slice(i+1); (o[k]=o[k]||[]).push(v); }); return o; };
  var byPath = {};
  Object.keys(D).forEach(function(k){ var sp=k.indexOf(' '), m=k.slice(0,sp), rest=k.slice(sp+1); var qi=rest.indexOf('?'); var p=qi<0?rest:rest.slice(0,qi); var key=m+' '+p; (byPath[key]=byPath[key]||[]).push({q:parseQ(qi<0?'':rest.slice(qi+1)), v:D[k]}); });
  function lookup(method, url){
    url = String(url);
    var u = new URL(url, location.href); var path=u.pathname.replace(/^.*?(\/api\/|\/health)/, '$1'); var q=u.search.replace(/^\?/,'');
    var authed=false; try{ authed=sessionStorage.getItem('hx-auth')==='1'; }catch(e){ authed=!!window.__hxAuth; }
    var setAuth=function(v){ window.__hxAuth=v; try{ v?sessionStorage.setItem('hx-auth','1'):sessionStorage.removeItem('hx-auth'); }catch(e){} };
    if (path==='/api/session/end'){ setAuth(false); return {s:204, ct:'text/plain', r:null}; }
    if (path==='/api/session' && method==='POST'){ var b={}; try{ b=JSON.parse(arguments[2]||'{}'); }catch(e){}
      var id=String(b.sicil||b.username||b.userName||'').trim(), pw=String(b.password||'');
      if (!(id==='1001' && pw==='hidromek')) return {s:401, ct:'application/json', r:'{"title":"Unauthorized","status":401}'};
      setAuth(true); }
    else if (path==='/api/session' && method==='GET' && !authed && !window.__hxAuth){ return {s:401, ct:'application/json', r:'{"title":"Unauthorized","status":401}'}; }
    for (var i=0;i<H.length;i++){ var h=H[i]; if (h.m===method && h.re.test(path)) { var out=h.fn({path:path, query:parseQ(q), url:u, method:method}); if (out) return out; } }
    var exact = D[method+' '+path+(q?'?'+q:'')]; if (exact) return exact;
    /* kaydı olmayan makine grubu: boştaki bir grubun cevabı şablon olarak kullanılır */
    var T = window.__TEMPLATE_LINE, K = window.__KNOWN_LINES || [];
    if (T && !window.__inTpl) {
      var full = path+(q?'?'+q:''); var m = full.match(/(?:\/|=)((?:F6|KMP|F2|ESB|F1|SLN)-[A-Z]{3})(?=[\/&?-]|$)/);
      if (m && K.indexOf(m[1]) < 0) {
        window.__inTpl = true; var code=m[1];
        try { var r = lookup(method, url.replace(new RegExp(code,'g'), T)); } finally { window.__inTpl = false; }
        var names = window.__LINE_NAMES || {};
        var txt = (r.r||'').split(T).join(code); if (names[T] && names[code]) txt = txt.split(names[T]).join(names[code]);
        return {s:r.s, ct:r.ct, r:txt};
      }
    }
    var cands = byPath[method+' '+path];
    if (cands && cands.length){
      var want=parseQ(q), best=null, bs=-1;
      cands.forEach(function(c){ var s=0; Object.keys(want).forEach(function(k){ if(c.q[k]){ want[k].forEach(function(v){ if(isDate(v) || c.q[k].indexOf(v)>=0) s+=2; }); } else s-=1; }); Object.keys(c.q).forEach(function(k){ if(!want[k]) s-=1; }); if(s>bs){bs=s;best=c;} });
      return best.v;
    }
    (window.__miss=window.__miss||[]).push(method+' '+path+(q?'?'+q:''));
    if (method==='GET') return {s:200, ct:'application/json', r:'[]'};
    return {s:200, ct:'application/json', r:'{}'};
  }
  window.__mockLookup = lookup;
  var isApi = function(url){ try{ var p=new URL(url, location.href).pathname; return /\/api\/|\/health$/.test(p); }catch(e){ return false; } };

  /* XMLHttpRequest */
  var RealXHR = window.XMLHttpRequest;
  function FakeXHR(){ this._real=null; this.readyState=0; this.status=0; this.statusText=''; this.responseText=''; this.response=null; this.responseType=''; this.responseURL=''; this._h={}; this._ls={}; this.upload={addEventListener:function(){},removeEventListener:function(){}}; this.timeout=0; this.withCredentials=false; }
  FakeXHR.prototype.open=function(m,u){ this._m=String(m).toUpperCase(); this._u=String(u); if(!isApi(this._u)){ var r=this._real=new RealXHR(); var self=this; ['load','error','abort','timeout','loadend','readystatechange','progress','loadstart'].forEach(function(t){ r.addEventListener(t,function(e){ ['readyState','status','statusText','responseText','response','responseURL'].forEach(function(k){ try{ self[k]=r[k]; }catch(_){} }); self._fire(t,e); }); }); r.open.apply(r,arguments); } else { this.readyState=1; } };
  FakeXHR.prototype.setRequestHeader=function(k,v){ if(this._real) return this._real.setRequestHeader(k,v); this._h[k.toLowerCase()]=v; };
  FakeXHR.prototype.getResponseHeader=function(k){ if(this._real) return this._real.getResponseHeader(k); k=k.toLowerCase(); return k==='content-type'?(this._ct||'application/json'):null; };
  FakeXHR.prototype.getAllResponseHeaders=function(){ if(this._real) return this._real.getAllResponseHeaders(); return 'content-type: '+(this._ct||'application/json')+'\r\n'; };
  FakeXHR.prototype.overrideMimeType=function(){};
  FakeXHR.prototype.abort=function(){ if(this._real) return this._real.abort(); };
  FakeXHR.prototype.addEventListener=function(t,f){ (this._ls[t]=this._ls[t]||[]).push(f); };
  FakeXHR.prototype.removeEventListener=function(t,f){ var a=this._ls[t]||[]; var i=a.indexOf(f); if(i>=0) a.splice(i,1); };
  FakeXHR.prototype._fire=function(t,e){ e=e||{type:t,target:this,loaded:0,total:0,lengthComputable:false}; var on=this['on'+t]; if(typeof on==='function') on.call(this,e); (this._ls[t]||[]).slice().forEach(function(f){ f.call(this,e); },this); };
  FakeXHR.prototype.send=function(body){
    if(this._real){ if(this.responseType) this._real.responseType=this.responseType; return this._real.send(body); }
    var self=this; var res; try{ res=lookup(this._m, this._u, body); }catch(e){ res={s:500,ct:'application/json',r:'{}'}; }
    if (window.__onMutation && this._m!=='GET') try{ window.__onMutation(this._m, this._u, body); }catch(e){}
    setTimeout(function(){
      self.status=res.s; self.statusText=res.s===200?'OK':''; self._ct=res.ct; self.responseURL=new URL(self._u,location.href).href;
      var txt=res.r==null?'':res.r; self.responseText=txt;
      if(self.responseType==='json'){ try{ self.response=txt?JSON.parse(txt):null; }catch(e){ self.response=null; } } else if(self.responseType==='blob'){ self.response=new Blob([txt],{type:res.ct}); } else self.response=txt;
      self.readyState=2; self._fire('readystatechange'); self.readyState=4; self._fire('readystatechange'); self._fire('load'); self._fire('loadend');
    }, 30);
  };
  window.XMLHttpRequest=FakeXHR;

  /* fetch */
  var realFetch = window.fetch;
  window.fetch=function(input, init){ var u=typeof input==='string'?input:(input&&input.url)||String(input); var m=((init&&init.method)||(input&&input.method)||'GET').toUpperCase(); if(!isApi(u)) return realFetch.apply(this,arguments); var res=lookup(m,u,init&&init.body); if (window.__onMutation && m!=='GET') try{ window.__onMutation(m,u,init&&init.body); }catch(e){} return new Promise(function(ok){ setTimeout(function(){ ok(new Response(res.r==null||res.s===204?null:res.r,{status:res.s,headers:{'content-type':res.ct}})); },30); }); };

  /* Canlı bağlantı (SignalR WebSocket): el sıkışmayı karşılar, çağrılara boş sonuç döner */
  var RealWS = window.WebSocket;
  function FakeWS(url){ var self=this; this.url=url; this.readyState=0; this.protocol=''; this.extensions=''; this.binaryType='blob'; this.bufferedAmount=0; this._ls={}; setTimeout(function(){ self.readyState=1; self._fire('open',{type:'open'}); },20); this._ping=setInterval(function(){ if(self.readyState===1) self._msg('{"type":6}\u001e'); },10000); }
  FakeWS.CONNECTING=0; FakeWS.OPEN=1; FakeWS.CLOSING=2; FakeWS.CLOSED=3;
  FakeWS.prototype.addEventListener=FakeXHR.prototype.addEventListener; FakeWS.prototype.removeEventListener=FakeXHR.prototype.removeEventListener;
  FakeWS.prototype._fire=function(t,e){ var on=this['on'+t]; if(typeof on==='function') on.call(this,e); (this._ls[t]||[]).slice().forEach(function(f){ f.call(this,e); },this); };
  FakeWS.prototype._msg=function(d){ var self=this; setTimeout(function(){ self._fire('message',{type:'message',data:d}); },10); };
  FakeWS.prototype.send=function(data){ var self=this; String(data).split('\u001e').filter(Boolean).forEach(function(part){ var m; try{ m=JSON.parse(part); }catch(e){ return; } if(m.protocol){ self._msg('{}\u001e'); } else if(m.type===1 && m.invocationId){ var res=(m.target==='Join')?{reload:false,missed:[]}:null; self._msg(JSON.stringify({type:3,invocationId:m.invocationId,result:res})+'\u001e'); } else if(m.type===4 && m.invocationId){ self._msg(JSON.stringify({type:3,invocationId:m.invocationId})+'\u001e'); } }); };
  FakeWS.prototype.close=function(){ clearInterval(this._ping); this.readyState=3; this._fire('close',{type:'close',code:1000,wasClean:true}); };
  window.WebSocket=function(url,p){ return /\/hubs\//.test(String(url)) ? new FakeWS(url) : new RealWS(url,p); };
  window.WebSocket.CONNECTING=0; window.WebSocket.OPEN=1; window.WebSocket.CLOSING=2; window.WebSocket.CLOSED=3;
})();
