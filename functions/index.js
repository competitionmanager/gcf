const functions = require('firebase-functions');
const admin = require('firebase-admin');
const dateFormat = require('dateformat');
admin.initializeApp();

// Get Firestore database handle
const db = admin.firestore();

// Firebase Cloud Messaging
async function sendNotification(token, message)
{
  const payload = {
    notification :{
      title: 'Event Update',
      body: message,
    }
  };
  const response = await admin.messaging().sendToDevice(token, payload);

  // For each message check if there was an error.
  console.log(`FCM successfully sent ${response.successCount} messages.`);
  const tokensToRemove = [];
  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      console.error('Failure sending notification to', token, error);
      // Cleanup the tokens who are not registered anymore.
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        tokensToRemove.push(tokensSnapshot.ref.child(tokens).remove());
      }
    }
  });
  return Promise.all(tokensToRemove);
}

async function getTokenAndNotify(subscriber, message)
{
  const documentPath = `users/${subscriber}`;
  const document = db.doc(documentPath);
  console.log(`Getting token from document path: ${documentPath}`);
  try {
    let query = await document.get();
    if (!query.exists) {
      console.log(`${subscriber} does not exist in users.`);
    }
    else {
      let token = query.get("token");
      console.log("user", subscriber, "token", token);
      return sendNotification(token, message);
    }
  }
  catch (err) {
    console.log('Error getting document', err);
  }
}

async function handleTimeUpdate(message, newData)
{
  console.log(message);
  const subscribers = newData["subscribers"];
  for (let subscriber of subscribers) {
    getTokenAndNotify(subscriber, message);
  }
}

// Listen for any change in collection `events`.
exports.handleEventUpdate = functions.firestore
  .document('competitions/{competition}/events/{event}').onWrite((change, context) => {
      console.log("Received change to events collection");
      const oldData = change.before.data();
      const newData = change.after.data();
      console.log(`Old data = ${JSON.stringify(oldData)}`);
      console.log(`New data = ${JSON.stringify(newData)}`);

      // Check for changes in startTime
      if (oldData["startTime"].toDate().getTime() !== newData["startTime"].toDate().getTime()) {
        const newDataStartTime = newData["startTime"].toDate();
        const oldDateStartTime = oldData["startTime"].toDate();

        const message = `The start time for ${newData["name"]} has been changed from ${dateFormat(oldDateStartTime, "hh:MM")} to ${dateFormat(newDataStartTime, "hh:MM")}`;
        handleTimeUpdate(message, newData);
      }
      return 0;
    });