import {tabOS,tabFS,tabNT} from "./tabos.js";
import Base64 from "./utils/base64.js";
import setupDef from "./setup/setup.js";
import {zip2Path,zip2NewPath} from "./zippath/zippath.js";

console.log("start.js");
tabOS.setup().then(async ()=>{
	let text;
	let util=window.util;
	window.tabOS=null;//Make sure our frame's tabOS is root.

	let appFrame = document.createElement("iframe");
	let safeSizes= await util.callNativeFunction("getSafeAreaInsets");
	console.log("safeSizes:");
	console.log(safeSizes);
	window.appFrame=appFrame;
	appFrame.style = "position:absolute; left:0px; top:"+safeSizes.top+"px; width: "+window.innerWidth+"px; height: "+(window.innerHeight-safeSizes.top-safeSizes.bottom*0.5)+`px; border: 0px;background:"white"`;
	document.body.appendChild(appFrame);
	
	//Register read file:
	util.registerMessageListener("readFile",async (event)=>{
		let path=event.path;
		let callSeq=event.$$callSeq;
		try{
			let data;
			//console.log("###readFile: "+path);
			if(path.startsWith("/@")){
				//console.log("###find package-path: "+path);
				path=await tabFS.getPkgPath(path);
				data=await tabFS.readFile(path);
				data=Base64.encode(data);
				//console.log("###jump to path: "+path);
				util.returnJSCall(event.$$callSeq,{data:data,path:path,newPath:"app://www.ai2apps.com/~"+path});
				return;
			}
			data=await tabFS.readFile(path);
			data=Base64.encode(data);
			util.returnJSCall(event.$$callSeq,{data:data,path:path});
		}catch(err){
			console.log("###readFile error: "+event.path);
			console.log(err);
			util.returnJSCall(event.$$callSeq,{err:""+err});
		}
	});
	
	//Setup
	{
		let curVersion;
		try{
			curVersion=await tabFS.readFile("/coke/setup_version_idx.txt","utf8");
		}catch(err){
			curVersion="";
		}
		console.log("Check current install: "+curVersion);

		if(curVersion!==(""+setupDef.versionIdx)){
			let zipDisks,diskName,zipPath,zipData;
			console.log("Will install new version: "+setupDef.versionIdx);
			if(setupDef.runOnPreSetup){
				await setupDef.runOnPreSetup();
			}
			zipDisks=setupDef.disks;

			//First dropOld disks:
			for(diskName in zipDisks){
				console.log("Drop disk: "+diskName);
				await tabFS.dropDisk(diskName);
			}
			
			//Unzip disks:
			for(diskName in zipDisks){
				console.log("Setup disk: "+diskName);
				await tabFS.newDir("/"+diskName);
				try{
					zipPath="/@/setup/"+zipDisks[diskName];
					console.log("fetch zip from : "+zipPath);
					zipData=await (await fetch(zipPath)).arrayBuffer();
				}catch(err){
					console.log("fetch zip error : "+err);
					return;
				}
				try{
					console.log("Unzip disk: "+diskName);
					await zip2NewPath("/"+diskName,zipData);
				}catch(err){
					console.log("Unzip zip error : ");
					console.log(err);
					return;
				}
			}
			
			//Update version:
			await tabFS.writeFile("/coke/setup_version_idx.txt",""+setupDef.versionIdx,"utf8");
			console.log("Setup Tab-OS done, new version-Idx: "+setupDef.versionIdx);
			if(setupDef.runOnPostSetup){
				await setupDef.runOnPostSetup();
			}
		}
		if(setupDef.run){
			await setupDef.run();
		}
		//Start app:
		window.appFrame.src=setupDef.entry;
	}
});
