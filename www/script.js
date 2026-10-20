import { App } from '@capacitor/app';

// Back button theek se kaam karne ke liye
App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    App.exitApp();
  }
});

// APNE EXTENSION KA JAVASCRIPT YAHAN PASTE KAREIN
console.log("App successfully loaded!");
