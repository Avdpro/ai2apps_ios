
let panndingCalls=[];
let basePath="/ws/";
let callSeq=0;

//----------------------------------------------------------------------------
//JAX用来进行WebAPI调用的类:
var WebAPI={
	path:null,
};

//----------------------------------------------------------------------------
//API调用:
WebAPI.makeCall=function(msg,vo,timeOut=0){
	var msgVO,text,self,path;
	path=this.path||basePath;
	self=this;
	msgVO={msg:msg,vo:vo,seq:callSeq++};
	text=JSON.stringify(msgVO);
	if(timeOut>0){
		return new Promise((okFunc,errFunc)=>{
			let canceled=0;
			window.setTimeout(()=>{
				canceled=1;
				errFunc({code:503,info:"Web API call time out."});
			},timeOut);
			fetch(self.path||basePath,{
				method: 'POST',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json'
				},
				body:text
			}).then(res=>{
				if(!canceled){
					okFunc(res.json());
				}
			}).catch(err=>{
				if(!canceled){
					errFunc(err);
				}
			});
		});
	}
	return fetch(self.path||basePath,{
		method: 'POST',
		cache: 'no-cache',
		headers: {
			'Content-Type': 'application/json'
		},
		body:text
	}).then(res=>{
		return res.json().then(resVO=>{
			if(!("code" in resVO)){
				resVO.code=res.status;
			}
			return resVO;
		});
	});
};

//----------------------------------------------------------------------------
//设置APIPath:
WebAPI.setAPIPath=function(path){
	this.path=path;
};

//----------------------------------------------------------------------------
//得到API的Path
WebAPI.getPath=async function(){
	let vo;
	if(this.path){
		return this.path;
	}
	vo=await this.makeCall("apiPath",{});
	if(vo.code===200){
		this.path=vo.path;
		return this.path;
	}
	return null;
};

export default WebAPI;
export {WebAPI};
