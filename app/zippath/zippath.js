import pathLib from "../utils/path.js";
import {tabFS as JAXDisk} from "../tabos.js";
import JSZip from "./jszip.min.js";
import * as DiskDB from "../tabos_fsdb.js";

//----------------------------------------------------------------------------
let zipPath=async function(path,tty){
	let zipFile;
	async function zipDir(dirPath,zipPath){
		let i,n,stub,list;
		zipFile.folder(zipPath);
		list=await JAXDisk.getEntries(dirPath);
		n=list.length;
		for(i=0;i<n;i++){
			stub=list[i];
			if(stub.dir){
				await zipDir(pathLib.join(dirPath,stub.name),pathLib.join(zipPath,stub.name));
			}else{
				let fileData,fileName;
				fileName=pathLib.join(dirPath,stub.name);
				if(tty){
					tty.clearLine();
					tty.textOut(`Packing file: ${fileName}`);
				}
				fileData=await JAXDisk.readFile(fileName);
				if(fileData) {
					fileData=new Uint8Array(fileData);//Makesure type
					zipFile.file(fileName, fileData);
				}
			}
		}
	}
	if(tty){
		tty.textOut("Creating zip...");
	}
	zipFile=new JSZip();
	let entry=await JAXDisk.getEntry(path);
	if(entry.dir){
		return zipDir(path,tty).then(()=>{
			return zipFile.generateAsync({
				type : "uint8array",
				compression: "DEFLATE",
				compressionOptions: {level: 6}				
			});
		});
	}else{
		let fileData,fileName;
		fileData=await JAXDisk.readFile(path);
		fileData=new Uint8Array(fileData);//Makesure type
		fileName=pathLib.basename(path);
		zipFile.file(fileName,fileData);//TODO: is name needed？
		return zipFile.generateAsync({
			type : "uint8array",
			compression: "DEFLATE",
			compressionOptions: {level: 6}				
		}).then((data)=>{
			if(tty){
				tty.clearLine();
				tty.textOut("Zip created.\n");
			}
			return data;
		});
	}
};

//----------------------------------------------------------------------------
//Make a zip based on certain path
let path2Zip=async function (path,items,tty,opts) {
	let disk,zipFile;
	let pts,diskName;
	opts=opts||{};
	pts=path.split("/");
	if(pts[0]!==""){
		throw Error("Path must be absolute.");
	}
	diskName=pts[1];
	if(!diskName){
		throw Error("Disk name error.");
	}
	if(pts.length===2){
		path="";
	}else{
		path=pts.slice(2).join("/");
	}

	disk=await JAXDisk.openDisk(diskName,0);
	if(!disk){
		throw Error("Disk open error.");
	}
	async function zipDir(dirPath,zipPath,list){
		let i,n,stub;
		zipFile.folder(zipPath);
		if(!list){
			list=await disk.getEntries(dirPath);
		}
		n=list.length;
		for(i=0;i<n;i++){
			stub=list[i];
			if(stub.dir){
				await zipDir(pathLib.join(dirPath,stub.name),pathLib.join(zipPath,stub.name));
			}else{
				let fileData;
				if(tty){
					tty.clearLine();
					tty.textOut("Creating zip...");
				}
				fileData=await disk.loadFile(pathLib.join(dirPath,stub.name));
				if(fileData) {
					fileData=new Uint8Array(fileData);//Makesure type
					zipFile.file(pathLib.join(zipPath, stub.name), fileData);
				}
			}
		}
	}
	if(tty){
		tty.textOut("Creating zip...");
	}

	zipFile=new JSZip();
	let entry=await disk.getEntry(path);
	if(entry.dir){
		return zipDir(path,"",items).then(()=>{
			if(opts.zipObj){
				return zipFile;
			}
			return zipFile.generateAsync({
				type : "uint8array",
				compression: "DEFLATE",
				compressionOptions: {level: 6}				
			});
		});
	}else{
		let fileData,fileName;
		fileData=await disk.loadFile(path);
		fileData=new Uint8Array(fileData);//Makesure type
		fileName=pathLib.basename(path);
		zipFile.file(fileName,fileData);//TODO: is name needed？
		if(opts.zipObj){
			return zipFile;
		}
		return zipFile.generateAsync({
			type : "uint8array",
			compression: "DEFLATE",
			compressionOptions: {level: 6}				
		}).then((data)=>{
			if(tty){
				tty.clearLine();
				tty.textOut("Zip created.\n");
			}
			return data;
		});
	}
};

//----------------------------------------------------------------------------
//Unpack zip to path
let zip2Path=async function(path,zipFile,dirZipName=0,tty=null,peelRoot=false,deltaTime=0){
	var zipDir,zipDirs,zipName,disk,zipData;
	let basePath,pts,diskName;
	let rootName,willPeel=false;

	async function arrayBuffer(file){
		if(file.arrayBuffer){
			return file.arrayBuffer();
		}
		return new Promise((onDone)=>{
			let reader=new FileReader();
			reader.onload=function(event) {
				let arrayBuffer = event.target.result;
				onDone(arrayBuffer);
			};
			reader.readAsArrayBuffer(file);
		});
	}
	

	pts=path.split("/");
	if(pts[0]!==""){
		throw Error("Path must be absolute.");
	}
	diskName=pts[1];
	if(!diskName){
		throw Error("Disk name error.");
	}
	if(pts.length===2){
		basePath="";
	}else{
		basePath=pts.slice(2).join("/");
	}

	
	disk=await JAXDisk.openDisk(diskName,0);
	if(!disk){
		throw Error("Disk open error.");
	}

	zipDirs=[];
	if(zipFile instanceof Uint8Array){
		zipData=zipFile;
		zipDir=basePath;
	}else if(zipFile instanceof ArrayBuffer){
		zipData=zipFile;
		zipDir=basePath;
	}else{
		zipData=await arrayBuffer(zipFile);
		if(dirZipName){
			zipName=zipFile.name||"";
			{
				let pos;
				pos=zipName.lastIndexOf(".");
				if(pos>0){
					zipName=zipName.substring(0,pos);
				}
			}
			zipDir=basePath+(basePath?"/":"")+zipName;
		}else{
			zipDir=basePath;
		}
	}

	async function doFiles(list){
		let filePath,i,n,path,zipObj,buf,time;
		n=list.length;
		for(i=0;i<n;i++){
			path=list[i].path;
			zipObj=list[i].zipObj;
			time=list[i].time;
			filePath=pathLib.join(zipDir,path);
			if(tty){
				tty.clearLine();
				tty.textOut("Extracting file: "+path);
			}
			buf=await zipObj.async("uint8array");
			await disk.saveFile(filePath,buf);
			if(time>0){
				await disk.setEntryInfo(filePath,{modifyTime:time+deltaTime,createTime:time+deltaTime});
			}
			/*await zipObj.async("uint8array").then((buf)=>{
				return disk.saveFile(filePath,buf);
			});*/
		}
		return true;
	}

	async function doDirs(list){
		let i,n,path;
		n=list.length;
		for(i=0;i<n;i++){
			path=list[i];
			await disk.newDir(path);
		}
		return true;
	}
	
	if(tty){
		tty.textOut("Reading zip...");
	}
	return JSZip.loadAsync(zipData).then(zip=>{
		let stub,nowTime;
		let list=[];
		nowTime=Date.now();
		if(zip.length===1){
			let zipObj=zip[0];
			if(zipObj.dir){
			}
			//TODO: 单个文件?
		}else{
			if(peelRoot){
				let pos;
				willPeel=true;
				//First, find root:
				zip.forEach((path,zipObj)=>{
					if(!willPeel)
						return;
					if(!rootName){
						pos=path.indexOf("/");
						if(pos<0){
							if(zipObj.dir){
								rootName=path+"/";
							}else{
								willPeel=false;
							}
						}else{
							rootName=path.substring(0,pos+1);
						}
					}else{
						if(!path.startsWith(rootName)){
							willPeel=false;
						}
					}
				});
			}
			if(willPeel && rootName){
				let peelLength;
				peelLength=rootName.length;
				zip.forEach((path,zipObj)=>{
					if(zipObj.dir){
						if(path!==rootName){
							let dirPath;
							path=path.substring(peelLength);
							dirPath=pathLib.join(zipDir,path);
							zipDirs.push(dirPath);
						}
					}else{
						path=path.substring(peelLength);
						stub={path:path,zipObj:zipObj};
						if(zipObj.date && zipObj.date.getTime){
							stub.time=Date.parse(zipObj.date).getTime();
						}
						list.push(stub);
					}
				});
			}else{
				zip.forEach((path,zipObj)=>{
					if(zipObj.dir){
						let dirPath;
						dirPath=pathLib.join(zipDir,path);
						zipDirs.push(dirPath);
					}else{
						stub={path:path,zipObj:zipObj};
						if(zipObj.date){
							try{
								stub.time=Date.parse(zipObj.date).getTime();
							}catch(err){
							}
						}
						list.push(stub);
					}
				});
			}
			return doFiles(list).then(()=>{
				doDirs(zipDirs).then(()=>{
					if(tty){
						tty.clearLine();
						tty.textOut("Extract zip done.\n");
					}
				});
			});
		}
	});
};

//----------------------------------------------------------------------------
//Unpack zip to new path, this can speed up a lot:
let zip2NewPath=async function(tgtPath,zipFile,tty=null,peelRoot=false,deltaTime=0){
	let dirEntries={};
	let pmsList=[];
	let disk,diskName,zipDir,pms,zipDirObj,dirPrefix;
	let rootName,willPeel=false;
	let nowTime=Date.now();

	async function arrayBuffer(file){
		if(file.arrayBuffer){
			return file.arrayBuffer();
		}
		return new Promise((onDone)=>{
			let reader=new FileReader();
			reader.onload=function(event) {
				let arrayBuffer = event.target.result;
				onDone(arrayBuffer);
			};
			reader.readAsArrayBuffer(file);
		});
	}

	async function parseTgtPath(){
		if(tgtPath.endsWith("/")){
			tgtPath=tgtPath.substring(tgtPath.length-1);
		}
		if(!tgtPath.startsWith("/")){
			throw Error(`Zip path ${tgtPath} is not full-path`);
		}
		let pos=tgtPath.indexOf("/",1);
		if(pos>0) {
			diskName = tgtPath.substring(1, pos);
			zipDir = tgtPath.substring(pos + 1);
			dirPrefix=zipDir+"/";
		}else{
			diskName = tgtPath.substring(1);
			zipDir = "";
			dirPrefix="";
		}
		disk = await JAXDisk.openDisk(diskName, true);
		zipDirObj=await DiskDB.get(zipDir||".",disk.dbStore);
		dirEntries[""]=zipDirObj;
	}
	
	function parsePath(path){
		let pos=path.lastIndexOf("/");
		if(pos>0){
			return [path.substring(0,pos),path.substring(pos+1)];
		}
		return ["",path];
	}
	
	function getDir(dir){
		let entry;
		entry=dirEntries[dir];
		if(!entry){
			entry={};
			dirEntries[dir]=entry;
			if(dir) {
				let [dirname, basename] = parsePath(dir);
				let upperEntry = getDir(dirname);
				let time = Date.now();
				upperEntry[basename] = { name: basename, dir: 1, createTime: time+deltaTime, modifyTime: time+deltaTime};
			}
		}
		return entry;
	}
	
	async function digestBytes(buf) {
		let hex;
		const hashBuffer = await crypto.subtle.digest('SHA-256', buf);     // hash the data
		const hashArray = Array.from(new Uint8Array(hashBuffer));          // convert buffer to byte array
		hex= hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
		return hex;
	}
	
	function writeFile(path,data,time){
		let [dirname,basename]=parsePath(path);
		let dirEntry=getDir(dirname);
		return digestBytes(data).then(byteHex=>{
			dirEntry[basename]={name:basename,dir:0,createTime:time+deltaTime,modifyTime:time+deltaTime,size:data.byteLength,modified:true,
								hash:byteHex};
			return DiskDB.set(dirPrefix+path,data,disk.dbStore);
		});
	}

	let zipBuf,zip,fileList=[];
	if(zipFile instanceof Uint8Array){
		zipBuf=zipFile;
	}else if(zipFile instanceof ArrayBuffer){
		zipBuf=zipFile;
	}else{
		zipBuf=await arrayBuffer(zipFile);
	}
	zip=await JSZip.loadAsync(zipBuf);

	await parseTgtPath();

	//disk=await JAXDisk.openDisk(diskName,true);
	if(peelRoot){
		let pos;
		willPeel=true;
		//First, find root:
		zip.forEach((path,zipObj)=>{
			if(!willPeel)
				return;
			if(!rootName){
				pos=path.indexOf("/");
				if(pos<0){
					if(zipObj.dir){
						rootName=path+"/";
					}else{
						willPeel=false;
					}
				}else{
					rootName=path.substring(0,pos+1);
				}
			}else{
				if(!path.startsWith(rootName)){
					willPeel=false;
				}
			}
		});
	}
	if(willPeel && rootName){
		let peelLength,stub,date;
		peelLength=rootName.length;
		zip.forEach((path,zipObj)=>{
			if(zipObj.dir){
				if(path!==rootName){
					path=path.substring(peelLength);
					if(path.endsWith("/")){
						path=path.substring(0,path.length-1);
					}
					getDir(path);
				}
			}else{
				path=path.substring(peelLength);
				stub={path:path,zipObj:zipObj};
				fileList.push(stub);
				date=zipObj.date;
				if(date && date.getTime){
					stub.time=date.getTime();
				}
			}
		});
	}else{
		let stub,date;
		zip.forEach((path,zipObj)=>{
			if(zipObj.dir){
				if(path.endsWith("/")){
					path=path.substring(0,path.length-1);
				}
				getDir(path);
			}else{
				stub={path:path,zipObj:zipObj};
				fileList.push(stub);
				date=zipObj.date;
				if(date && date.getTime){
					stub.time=date.getTime();
				}
			}
		});
	}
	
	async function unpackFile(stub){
		let filePath=stub.path;
		let zipObj=stub.zipObj;
		let buf;
		buf=await zipObj.async("uint8array");
		if(tty){
			tty.clearLine();
			tty.textOut("Extracting file: "+filePath);
		}else{
			console.log("Extracting file: "+filePath);
		}
		pms=writeFile(filePath,buf,stub.time||nowTime).then(()=>{
			if(tty){
				tty.clearLine();
				tty.textOut("Extracted file: "+filePath);
			}else{
				console.log("Extracted file: "+filePath);
			}
		});
		pmsList.push(pms);
	}

	for(let i=0,n=fileList.length;i<n;i++){
		await unpackFile(fileList[i]);
	}
	await Promise.all(pmsList);//Wait all file write into disk
	pmsList.splice(0);
	let dirPath,dirEntry;
	dirEntry=dirEntries[""];
	delete dirEntries[""];
	if(zipDir){
		pms=DiskDB.set(zipDir,dirEntry,disk.dbStore);
		pmsList.push(pms);
	}else{
		pms=DiskDB.set(".",dirEntry,disk.dbStore);
		pmsList.push(pms);
	}
	let dirKeys=Object.keys(dirEntries);
	for(let i=0,n=dirKeys.length;i<n;i++){
		dirPath=dirKeys[i];
		dirEntry=dirEntries[dirPath];
		pms=DiskDB.set(dirPrefix+dirPath,dirEntry,disk.dbStore);
		pmsList.push(pms);
	}
	await Promise.all(pmsList);
	if(tty){
		tty.clearLine();
		tty.textOut("Extract zip done");
	}else{
		console.log("Extract zip done");
	}
};

export {JSZip,path2Zip,zip2Path,zip2NewPath,zipPath};
