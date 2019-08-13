const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Listen for any change in collection `users`.
exports.handleEventUpdate = functions.firestore
  .document('users/{user}').onWrite((change, context) => {
      console.log("Received change to users collection");
      const previousValue = change.before.data();
      const nextValue = change.after.data();
      console.log("user = " + context.params.user);
      console.log(previousValue);
      console.log(nextValue);

      return;
    });

// Listen for any change in collection 'events'.
exports.sendNotification = functions.firestore
  .document("events/{evt}").onWrite((change, context) => {
      console.log("Received change to events collection.");
      const evt = context.params.evt;
      console.log("evt= " + evt);

      // TODO: Get the list of followers, then read from users table to get the
      // the notificationToken for each user. Finally, use FCM to push notification to user.

      return;
  });
