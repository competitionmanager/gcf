const functions = require('firebase-functions');
const admin = require('firebase-admin');
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

async function getTokenAndNotify(follower, message)
{
  const documentPath = `users/${follower}`;
  const document = db.doc(documentPath);
  console.log(`Getting token from document path: ${documentPath}`);
  try {
    let query = await document.get();
    if (!query.exists) {
      console.log(`${follower} does not exist in users.`);
    }
    else {
      let token = query.get("token");
      console.log("user", follower, "token", token);
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
  const followers = newData["followers"];
  for (let follower of followers) {
    getTokenAndNotify(follower, message);
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
        const message = `The starttime for ${newData["name"]} has been changed to: ${newDataStartTime}`;
        handleTimeUpdate(message, newData);
      }

      // Check for changes in endTime
      if (oldData["endTime"].toDate().getTime() !== newData["endTime"].toDate().getTime()) {
        const newDataEndTime = newData["endTime"].toDate();
        const message = `The end time for ${newData["name"]} has been changed to: ${newDataEndTime}`;
        handleTimeUpdate(message, newData);
      }
      return 0;
    });