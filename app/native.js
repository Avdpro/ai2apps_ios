let callNativeFunction;
let registerMessageListener;

(function(util) {
	let callMap=new Map();
	let _nextCallSeq=1;
	let handlerMap=new Map();
	let nextCallSeq;
	//------------------------------------------------------------------------
	window.$nextCallSeq=nextCallSeq=function(){
		if(window.parent && window.parent!==window){
			return window.parent.$nextCallSeq();
		}
		return _nextCallSeq++;
	};

	//------------------------------------------------------------------------
	//$callSeq used for JS->Native call, $$callSeq used for Native->JS call
	util.callNativeFunction=callNativeFunction = async function(name, params) {
		let pms,callSeq;
		callSeq=nextCallSeq();
		if (window.webkit && window.webkit.messageHandlers) {
			var call = window.webkit.messageHandlers[name];
			if (call) {
				params=params||{};
				params.$callSeq=callSeq;
				pms=new Promise((resolve,reject)=>{
					callMap.set(callSeq,{resolve,reject});
				});
				call.postMessage(params);
			}
		}
		return await pms;
	};
	
	//------------------------------------------------------------------------
	//$callSeq used for JS->Native call, $$callSeq used for Native->JS call
	util.returnJSCall=returnJSCall = async function(callSeq, params) {
		if (window.webkit && window.webkit.messageHandlers) {
			let call = window.webkit.messageHandlers["callJSResult"];
			if (call) {
				params=params||{};
				params.$$callSeq=callSeq;
				call.postMessage(params);
			}
		}
	};

	//------------------------------------------------------------------------
	util.registerMessageListener=registerMessageListener=function(msg,callback){
		handlerMap.set(msg,callback);
	};

	//------------------------------------------------------------------------
	//$callSeq used for JS->Native call, $$callSeq used for Native->JS call
	let handleMessage=function(event){
		let callSeq=event.$callSeq;
		let msgCode=event.msg;
		if(callSeq>=0){
			let stub = callMap.get(callSeq);
			if(stub){
				callMap.delete(callSeq)
				stub.resolve(event.result);
			}
			return;
		}
		if(msgCode){
			let callback=handlerMap.get(msgCode);
			if (callback) {
				callback(event);
			}
		}
	};
	
	if (window.parent!==window) {
		window.receiveMessage=handleMessage;
	} else {
		window.receiveMessage = function(message) {
			let i,n,list,winObj;
			handleMessage(message);
			list=window.frames;
			n=list.length;
			for (i = 0; i < n; i++) {
				winObj=list[i].contentWindow;
				winObj && winObj.receiveMessage && winObj.receiveMessage(message);
			}
		};
	}
	
	
	function OnOffCallbackList() {
		this.list = [];
		this.on = function(callback) {
			if (-1 == this.list.indexOf(callback)) {
				this.list.push(callback);
			}			
		};
		this.off = function(callback) {
			var index = this.list.indexOf(callback);
			if (-1 != index) {
				this.list.splice(index, 1); 
			}			
		};
		this.visit = function(func) {
			for (var i = 0; i < this.list.length; i++) {
				func(this.list[i]);
			}
		};
	}
	
	util.shellExec = function(url) {
		callNativeFunction("shellExec", {
			url: url			
		});
	};
	
	util.saveImageToPhotosAlbum = function(obj) {
		callNativeFunction("saveImageToPhotosAlbum", {
			filePath: obj.filePath
		});
	};
	
	util.chooseImage =async function(sourceType){
		return await callNativeFunction("chooseImage",{sourceType:sourceType});
	};
	
	util.setClipboardData = async function(data) {
		return await callNativeFunction("setClipboardData", {
			data:data || ""
		});
	};

	util.getClipboardData = async function() {
		return await callNativeFunction("getClipboardData", {});
	};
	
	util.setKeepScreenOn = async function(keepOn) {
		return await callNativeFunction("setKeepScreenOn", {
			keepScreenOn: keepOn
		});
	};
	
	util.restart = function() {
		if (window.native && window.native.reload) {
			window.native.reload();
		} else if (window.parent) {
			window.parent.location.reload();
		} else {
			location.reload();
		}
	};
	
	{
		util.getNativeBoundleName=async function(){
			return await callNativeFunction("getBoundleName", {});
		};
		util.getNativeBoundleVersion=async function(){
			return await callNativeFunction("getBoundleVersion", {});
		};
		util.getNativeBoundleBuildVersion=async function(){
			return await callNativeFunction("getBoundleBuildVersion", {});
		};
	}
	
	window.openWebView = function(url) {
		callNativeFunction("openWebView", {
			url: url
		});		
	};
		
})(window.util || (window.util = {}));

