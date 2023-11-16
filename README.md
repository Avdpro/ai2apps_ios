# ai2apps_ios
This is a sample AI2Apps iOS App project. 

## How to start:
Clone this project and open it with XCode then you run it with simulator.

## Run your own AI2Apps project:
1. **Check cokemoke file**: If your AI2Apps is create by wizzard, it should come with 2 files "cokemake.config.js" and "setup.template.js". Some old template may not come with this file, you can just copy them from other projects you found has them.
2. Review "cokemake.config.js", check if you need add more contents into it.
3. Open a terminal and enter your project's dir.
4. Run command: `cokemake app`
5. Wait for cokemake to make the package zip. When done, a "setup.zip" file should be found in your project's "dist" foler.
6. Download "setup.zip".
7. In your iOS project, you should find a "setup" dir (<XCODE-PRJ-DIR>ai2apps/app/setup). Remove all contents in this dir.
8. Unzip "setup.zip" contents into "<XCODE-PRJ-DIR>ai2apps/app/setup" dir.
9. Use XCode build and run your project again, you should see your AI Agent App running!

## How to debug:
### **What it should be** 
Safari should support debug iPhone Simulator's WebView instance. But I can't make it work... If you make it work, you can use Safari debug your app.  

### **What it works now** 
Currently I use VConsole inbuilt a on-screen-console to the app.  
**You need link your html with vconsole:**  
In your app's "app.html" file, find: 
```
		<!--
		/*#{PreScripts*/
		/*}#PreScripts*/
		-->
```
change it to:
```
		<!--
		/*#{PreScripts*/
		-->
		<script type="text/javascript">
			window.console=window.parent.console;
			window.onerror=(err)=>{console.log(err)};
		</script>
		<!--
		/*}#PreScripts*/
		-->
```


## TODO:
1. Device build support.
2. Better console support.
3. Example to add your own API.
4. WebView dialog example, call from your own app.
