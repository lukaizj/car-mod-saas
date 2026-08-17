const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("carmod", {
  platform: process.platform,
  appName: "carmod",
});
