whichJarFile  = arguments[0];
whichTestFile = arguments[1];

multiwindow = !(whichJarFile == "rhino");
whichInterpreter = whichJarFile + " interpreter jar";

load("dist/env.rhino.js");
load("test/" + whichTestFile + ".js");

Envjs.wait();
