if(!this.whichJarFile){
  whichJarFile = "rhino"
}
whichInterpreter = whichJarFile + " interpreter jar";
if(!this.multiwindow){
  multiwindow = false;
}
load("dist/env.rhino.js");
load("prototype.js");
